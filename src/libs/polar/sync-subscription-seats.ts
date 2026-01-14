// app/lib/polar/sync-subscription-seats.ts
import { resolveClientFromClientOrMember } from "src/app/actions/client/client-members";
import { readSubscriptionPlan } from "src/app/actions/subscription-plan/subscription-plan-actions";
import { polar } from "src/libs/polar/polar";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { TABLES } from "src/libs/supabase/tables";

type SyncSeatsArgs = { clientId: string };

export async function syncPolarSeatsForClient({ clientId }: SyncSeatsArgs) {

     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     const { success, data, error: resolveClientError } = await resolveClientFromClientOrMember(clientId)
     if (!success || !data) {
          return { success: false as const, error: resolveClientError || "Failed to resolve client." };
     }
     // 1) Load active subscription + Polar customer id
     const { data: sub, error: subErr } = await supabase
          .from(TABLES.CLIENT_SUBSCRIPTION)
          .select("id,status,subscription_id,polar_subscription_id,customer_id")
          .eq("customerId", data.id)
          .in("status", ["trialing", "active"])
          .maybeSingle();

     if (subErr || !sub?.polar_subscription_id || !sub.customer_id || !sub.subscription_id) {
          return { success: false as const, error: "No active Polar subscription found." };
     }

     // 2) Count apartments
     const { count, error } = await supabase
          .from(TABLES.APARTMENTS)
          .select("id, tblBuildings!inner(customerId)", { count: "exact", head: true })
          .eq("tblBuildings.customerId", data.id);

     if (error) {
          return { success: false as const, error: "Failed to count apartments." };
     }

     const { subscriptionPlan, readSubscriptionPlanSuccess, readSubscriptionPlanError } = await readSubscriptionPlan(sub.subscription_id)
     if (!readSubscriptionPlanSuccess || !subscriptionPlan) {
          return { success: false as const, error: readSubscriptionPlanError || "Failed to load subscription plan." };
     }

     const apartmentsCount = Math.max(0, count ?? 0);

     let subUpdate
     // 3) Ingest the usage event into Polar
     try {
          subUpdate = await polar.subscriptions.update({
               id: sub.polar_subscription_id,
               subscriptionUpdate: {
                    productId: sub.polar_subscription_id,
                    prorationBehavior: 'invoice',
                    seats: apartmentsCount * subscriptionPlan?.total_price_per_apartment_with_discounts! || 1,
               }
          })

          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: "",
               payload: {
                    clientId,
                    apartmentsCount,
                    polar_customer_id: sub.customer_id,
                    polar_subscription_id: sub.polar_subscription_id,
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
               payload: { clientId, apartmentsCount },
               status: "fail",
               type: "api",
               user_id: null,
          });

          return { success: false as const, error: err?.message };
     }
}

