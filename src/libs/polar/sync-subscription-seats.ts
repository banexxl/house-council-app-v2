// app/lib/polar/sync-subscription-seats.ts
import { getProductFromCustomerSubscription, readSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions";
import { polar } from "src/libs/polar/polar";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { TABLES } from "src/libs/supabase/tables";

type SyncSeatsArgs = { customerId: string };

export async function syncPolarSeatsForClient({ customerId }: SyncSeatsArgs) {

     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 1) Load active subscription + Polar customer id
     const { data: sub, error: subErr } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .select("id,status,customerId,productId")
          .eq("customerId", customerId)
          .in("status", ["trialing", "active"])
          .maybeSingle();
     if (subErr || !sub?.customerId || !sub?.id) {
          return { success: false as const, error: "No active Polar subscription found." };
     }

     // 2) Count apartments
     const { count, error } = await supabase
          .from(TABLES.APARTMENTS)
          .select("id, tblBuildings!inner(customerId)", { count: "exact", head: true })
          .eq("tblBuildings.customerId", customerId);
     if (error) {
          return { success: false as const, error: "Failed to count apartments." };
     }

     const { subscriptionPlan, readSubscriptionPlanSuccess, readSubscriptionPlanError } = await readSubscriptionPlan(sub.productId)
     if (!readSubscriptionPlanSuccess || !subscriptionPlan) {
          return { success: false as const, error: readSubscriptionPlanError || "Failed to load subscription plan." };
     }
     const apartmentsCount = Math.max(0, count ?? 0);
     //Get the product from the subscription and then its price
     const product = await getProductFromCustomerSubscription(customerId);
     if (!product) {
          return { success: false as const, error: "Failed to load product from subscription." };
     }

     let subUpdate
     // 3) Ingest the usage event into Polar
     try {
          subUpdate = await polar.subscriptions.update({
               id: sub.id,
               subscriptionUpdate: {
                    productId: product.id,
                    prorationBehavior: 'invoice',
                    seats: apartmentsCount * product?.prices[0]?.priceAmount! || 1,
               }
          })
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: "",
               payload: {
                    customerId,
                    apartmentsCount,
                    polar_customer_id: sub.customerId,
                    polar_subscription_id: sub.id,
                    subscription_update: subUpdate,
               },
               status: "success",
               type: "api",
               user_id: null,
          });

          return { success: true as const, usage: apartmentsCount };
     } catch (err: any) {
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: JSON.stringify(subUpdate) ?? "Polar events ingestion failed",
               payload: { customerId, apartmentsCount },
               status: "fail",
               type: "api",
               user_id: null,
          });
          console.log('subUpdate', subUpdate);
          return { success: false as const, error: err?.message };
     }
}

