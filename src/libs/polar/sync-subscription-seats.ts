// app/lib/polar/sync-subscription-seats.ts
import { polar } from "src/libs/polar/polar";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { TABLES } from "src/libs/supabase/tables";

type SyncSeatsArgs = {
     clientId: string;
     // if your apartments are per building, you can pass building_id and derive client_id,
     // but best is to pass clientId directly.
};

export async function syncPolarSeatsForClient({ clientId }: SyncSeatsArgs) {
     const t0 = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // 1️⃣ Load active / trialing subscription
     const { data: sub, error: subErr } = await supabase
          .from("tblClient_Subscription")
          .select("id, status, polar_subscription_id")
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

     // 2️⃣ Fetch all buildings for client
     const { data: buildings, error: bErr } = await supabase
          .from(TABLES.BUILDINGS)
          .select("id")
          .eq("client_id", clientId);

     if (bErr) {
          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: bErr.message,
               payload: { clientId },
               status: "fail",
               type: "db",
               user_id: null,
          });
          return { success: false as const, error: "Failed to fetch client buildings." };
     }

     const buildingIds = (buildings ?? []).map((b: any) => b.id);

     // No buildings → no apartments
     if (buildingIds.length === 0) {
          // Decide policy: quantity 1 vs 0
          // We default to 1 to avoid invalid subscription quantity
          try {
               await polar.subscriptions.update({
                    id: sub.polar_subscription_id,
                    quantity: 1,
               } as any);

               await logServerAction({
                    action: "syncPolarSeatsForClient",
                    duration_ms: Date.now() - t0,
                    error: "",
                    payload: { clientId, newQuantity: 1 },
                    status: "success",
                    type: "api",
                    user_id: null,
               });

               return { success: true as const, quantity: 1 };
          } catch (e: any) {
               await logServerAction({
                    action: "syncPolarSeatsForClient",
                    duration_ms: Date.now() - t0,
                    error: e?.message ?? "Polar update failed",
                    payload: { clientId, newQuantity: 1 },
                    status: "fail",
                    type: "api",
                    user_id: null,
               });

               return { success: false as const, error: e?.message ?? "Failed to update Polar subscription quantity." };
          }
     }

     // 3️⃣ Count apartments across all buildings
     const { count, error: countErr } = await supabase
          .from(TABLES.APARTMENTS)
          .select("id", { count: "exact", head: true })
          .in("building_id", buildingIds);

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

     const newQuantity = Math.max(1, count ?? 0);

     // 4️⃣ Update Polar subscription quantity
     try {
          await polar.subscriptions.update({
               id: sub.polar_subscription_id,
               quantity: newQuantity,
          } as any);

          await logServerAction({
               action: "syncPolarSeatsForClient",
               duration_ms: Date.now() - t0,
               error: "",
               payload: {
                    clientId,
                    newQuantity,
                    polar_subscription_id: sub.polar_subscription_id,
               },
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
               payload: {
                    clientId,
                    newQuantity,
                    polar_subscription_id: sub.polar_subscription_id,
               },
               status: "fail",
               type: "api",
               user_id: null,
          });

          return { success: false as const, error: e?.message ?? "Failed to update Polar subscription quantity." };
     }
}
