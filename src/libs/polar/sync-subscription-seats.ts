// app/lib/polar/sync-subscription-seats.ts
import { polar } from "src/libs/polar/polar";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { TABLES } from "src/libs/supabase/tables";

type SyncSeatsArgs = { clientId: string };

export async function syncPolarSeatsForClient({ clientId }: SyncSeatsArgs) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 1) Load active subscription + Polar customer id
     const { data: sub, error: subErr } = await supabase
          .from("tblClient_Subscription")
          .select("id, status, polar_subscription_id, polar_customer_id")
          .eq("client_id", clientId)
          .in("status", ["trialing", "active"])
          .maybeSingle();

     if (subErr || !sub?.polar_subscription_id || !sub.polar_customer_id) {
          return { success: false as const, error: "No active Polar subscription found." };
     }

     // 2) Count apartments
     const { count, error } = await supabase
          .from("tblApartments")
          .select("id, tblBuildings!inner(client_id)", { count: "exact", head: true })
          .eq("tblBuildings.client_id", clientId);

     if (error) {
          return { success: false as const, error: "Failed to count apartments." };
     }

     const apartmentsCount = Math.max(0, count ?? 0);

     // 3) Ingest the usage event into Polar
     try {
          await polar.events.ingest({
               events: [
                    {
                         // Match your meter filter: event_name must equal "apartment_usage"
                         name: "apartments_usage",

                         // Identify the customer
                         customerId: sub.polar_customer_id,

                         // Provide the property your meter sums
                         metadata: {
                              apartments_count: apartmentsCount,
                         },
                    },
               ],
          });

          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: "",
               payload: {
                    clientId,
                    apartmentsCount,
                    polar_customer_id: sub.polar_customer_id,
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
               error: err?.message ?? "Polar events ingestion failed",
               payload: { clientId, apartmentsCount },
               status: "fail",
               type: "api",
               user_id: null,
          });

          return { success: false as const, error: err?.message };
     }
}

