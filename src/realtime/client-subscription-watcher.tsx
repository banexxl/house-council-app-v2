"use client";

import { useEffect, useMemo } from "react";
import { initClientSubscriptionRealtime } from "src/realtime/sb-realtime";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "src/libs/supabase/sb-client";
import { useAuth } from "src/contexts/auth/auth-provider";
import { useRouter } from "next/navigation";

// Shape of tblClient_Subscription rows we care about
interface ClientSubscriptionRow {
     id: string;
     client_id: string;
     status: "trialing" | "active" | "past_due" | "canceled" | string;
     next_payment_date: string | null;
}

export default function ClientSubscriptionWatcher() {

     const { client, userData } = useAuth();
     const router = useRouter();

     const clientId = client?.id ?? null;

     useEffect(() => {
          let cleanup: (() => Promise<void>) | null = null;
          let cancelled = false;
          let intervalId: any = null;

          async function start() {
               if (!clientId) return;

               // 0) On load: ensure subscription is active, otherwise sign out
               try {
                    const { data: current, error: readErr } = await supabaseBrowserClient
                         .from('tblClient_Subscription')
                         .select('status')
                         .eq('client_id', clientId)
                         .single();

                    if (!readErr) {
                         const statusNow = (current as any)?.status as string | undefined;
                         if (!statusNow || statusNow !== 'active') {
                              if (process.env.NODE_ENV !== 'production') {
                                   console.warn('[ClientSubscriptionWatcher] Non-active status on load; signing out', { statusNow });
                              }
                              await supabaseBrowserClient.auth.signOut();
                              router.push('/auth/login');
                              return; // skip setting up realtime if we just signed out
                         }
                    } else {
                         if (process.env.NODE_ENV !== 'production') {
                              console.warn('[ClientSubscriptionWatcher] Failed to read current subscription; treating as non-active', readErr?.message);
                         }
                         await supabaseBrowserClient.auth.signOut();
                         router.push('/auth/login');
                         return;
                    }
               } catch (e) {
                    if (process.env.NODE_ENV !== 'production') {
                         console.error('[ClientSubscriptionWatcher] Error during initial status check', e);
                    }
                    // On unexpected error, be conservative and sign out
                    await supabaseBrowserClient.auth.signOut();
                    router.push('/auth/login');
                    return;
               }

               cleanup = await initClientSubscriptionRealtime([clientId], async (payload: RealtimePostgresChangesPayload<any>) => {
                    try {
                         const raw = (payload.new || payload.old || {}) as Partial<ClientSubscriptionRow>;
                         const row: ClientSubscriptionRow | null = (raw && typeof raw === 'object')
                              ? {
                                   id: String((raw as any).id || ''),
                                   client_id: String((raw as any).client_id || ''),
                                   status: ((raw as any).status as any) ?? 'active',
                                   next_payment_date: (raw as any).next_payment_date ?? null,
                              }
                              : null;
                         if (!row) return;
                         console.log('row', row);

                         const status = row.status;
                         const affectedClientId = row.client_id;

                         if (affectedClientId !== clientId) return;

                         if (payload.eventType === "DELETE") {
                              // On delete of subscription for this client -> sign out
                              await supabaseBrowserClient.auth.signOut();
                              router.push('/auth/login');
                              return;
                         }

                         if (payload.eventType === "UPDATE") {
                              console.log('usao u apdejt');

                              if (status && status !== "active") {
                                   console.log('aaaaaaaaaaaaaaaa');

                                   // If status is not active -> sign out
                                   await supabaseBrowserClient.auth.signOut();
                                   return;
                              }
                         }
                    } catch (e) {
                         if (process.env.NODE_ENV !== "production") {
                              console.error("[ClientSubscriptionWatcher] error handling payload", e);
                         }
                    }
               });

               // 1) Polling fallback every 15s in case realtime misses events
               // intervalId = setInterval(async () => {
               //      console.log('i am in');
               //      try {
               //           const { data: current, error: readErr } = await supabaseBrowserClient
               //                .from('tblClient_Subscription')
               //                .select('status')
               //                .eq('client_id', clientId)
               //                .single();
               //           if (!readErr) {
               //                const statusNow = (current as any)?.status as string | undefined;
               //                if (!statusNow || statusNow !== 'active') {
               //                     if (process.env.NODE_ENV !== 'production') {
               //                          console.warn('[ClientSubscriptionWatcher] Poll detected non-active; signing out', { statusNow });
               //                     }
               //                     await supabaseBrowserClient.auth.signOut();
               //                }
               //           }
               //      } catch (_e) {
               //           // ignore; rely on next tick
               //      }
               // }, 15000);
          }

          start();

          return () => {
               cancelled = true;
               if (cleanup) cleanup().catch(() => { });
               if (intervalId) clearInterval(intervalId);
          };
     }, [clientId]);

     return null;
}
