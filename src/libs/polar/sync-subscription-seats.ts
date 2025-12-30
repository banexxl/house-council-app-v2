// app/lib/polar/sync-subscription-seats.ts
import { polar } from "src/libs/polar/polar";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { TABLES } from "src/libs/supabase/tables";

type SyncSeatsArgs = { clientId: string };

export async function syncPolarSeatsForClient({ clientId }: SyncSeatsArgs) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 1) Load active/trialing subscription + current quantity (store it locally if you can)
     const { data: sub, error: subErr } = await supabase
          .from("tblClient_Subscription")
          .select("id, status, polar_subscription_id, polar_customer_id") // add more if needed
          .eq("client_id", clientId)
          .in("status", ["trialing", "active"])
          .maybeSingle();

     if (subErr) {
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: subErr.message,
               payload: { clientId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false as const, error: "Failed to load client subscription." };
     }

     if (!sub?.polar_subscription_id) {
          return { success: false as const, error: "No active Polar subscription found for this client." };
     }

     // 2) Count apartments for client via join (tblApartments -> tblBuildings -> client_id)
     const { count, error: countErr } = await supabase
          .from(TABLES.APARTMENTS)
          .select("id, building_id!inner(id, client_id)", { count: "exact", head: true })
          .eq("building_id.client_id", clientId);

     if (countErr) {
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: countErr.message,
               payload: { clientId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false as const, error: "Failed to count apartments." };
     }

     const newQuantity = Math.max(1, count ?? 0); // <-- policy: min 1

     // 3) Fetch current subscription in Polar (so we can skip if unchanged)
     let currentQuantity: number | null = null;
     try {
          const current = await polar.subscriptions.get({ id: sub.polar_subscription_id } as any);
          currentQuantity = (current as any)?.quantity ?? null;
     } catch {
          // not fatal — we'll just attempt update
     }

     if (currentQuantity !== null && currentQuantity === newQuantity) {
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: "",
               payload: { clientId, newQuantity, skipped: true },
               status: "success",
               type: "api",
               user_id: null,
          });
          return { success: true as const, quantity: newQuantity, skipped: true as const };
     }

     // 4) Update Polar subscription quantity
     try {
          await polar.subscriptions.update({
               id: sub.polar_subscription_id,
               quantity: newQuantity,
          } as any);

          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: "",
               payload: { clientId, newQuantity, polar_subscription_id: sub.polar_subscription_id },
               status: "success",
               type: "api",
               user_id: null,
          });

          return { success: true as const, quantity: newQuantity };
     } catch (e: any) {
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: e?.message ?? "Polar update failed",
               payload: { clientId, newQuantity, polar_subscription_id: sub.polar_subscription_id },
               status: "fail",
               type: "api",
               user_id: null,
          });

          return { success: false as const, error: e?.message ?? "Failed to update Polar subscription quantity." };
     }
}
