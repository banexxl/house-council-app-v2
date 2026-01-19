"use client"; // Ensures this component runs only on the client side (hooks + Supabase browser client)

import { useEffect } from "react"; // React hooks for lifecycle
import { initClientSubscriptionRealtime } from "src/realtime/sb-realtime"; // Helper to attach a filtered realtime listener for the client's subscription row
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"; // Type for realtime payload shape
import { supabaseBrowserClient } from "src/libs/supabase/sb-client"; // Preconfigured Supabase browser instance
import { useRouter } from "next/navigation"; // Client router for redirects after sign-out
import log from "src/utils/logger";
import { TABLES } from "src/libs/supabase/tables";
import { useState } from "react";

// Domain model: minimal subset of tblClient_Subscription columns needed here
interface ClientSubscriptionRow {
     id: string;
     customerId: string;
     status: "trialing" | "active" | "past_due" | "canceled" | string;
     next_payment_date: string | null;
}

// Component: Watches the current client's subscription status and signs the user out
// if their subscription leaves an allowed state (active | trialing). Provides both
// realtime and polling-based enforcement for resilience.
export default function ClientSubscriptionWatcher() {

     const [viewer, setViewer] = useState<{
          customer: { id: string } | null;
          userData: { id: string } | null;
     } | null>(null);
     const router = useRouter(); // Used to redirect to login after sign-out

     const customerId = viewer?.customer?.id ?? null; // Guard: no client => skip watcher logic

     useEffect(() => { // Core effect: sets up initial validation, realtime listener, and polling fallback
          let active = true;
          let authSub: ReturnType<typeof supabaseBrowserClient.auth.onAuthStateChange>['data']['subscription'] | null = null;

          const loadViewer = async () => {
               try {
                    const res = await fetch('/api/viewer', { cache: 'no-store' });
                    const data = await res.json();
                    if (active) {
                         setViewer({
                              customer: data?.customer ?? null,
                              userData: data?.userData ?? null,
                         });
                    }
               } catch (error) {
                    if (active) setViewer(null);
                    log('[ClientSubscriptionWatcher] Failed to load viewer', error);
               }
          };

          loadViewer();

          const authChange = supabaseBrowserClient.auth.onAuthStateChange(() => {
               loadViewer();
          });

          authSub = authChange?.data?.subscription ?? null;

          return () => {
               active = false;
               authSub?.unsubscribe();
          };
     }, []);

     useEffect(() => { // Core effect: sets up initial validation, realtime listener, and polling fallback
          let cleanup: (() => Promise<void>) | null = null; // Function to unsubscribe realtime channel
          let clientStatusChannel: ReturnType<typeof supabaseBrowserClient.channel> | null = null; // separate channel for client status

          let cancelled = false;
          let intervalId: any = null; // ID of polling interval
          let signingOut = false;

          async function start() { // Orchestrates the lifecycle: initial status check -> realtime -> polling
               console.log('customerId', customerId);

               if (!customerId) return;

               // Step 0: Initial snapshot validation - if subscription missing or not allowed, force sign-out early
               try {
                    const { data: current, error: readErr } = await supabaseBrowserClient
                         .from(TABLES.POLAR_SUBSCRIPTIONS)
                         .select('status')
                         .eq('customerId', customerId)
                         .single();
                    console.log('error', readErr);

                    if (!readErr) { // Successfully read subscription row
                         const statusNow = (current as any)?.status as string | undefined;
                         console.log('statusNow', statusNow);

                         if (!statusNow || (statusNow !== 'active' && statusNow !== 'trialing')) { // Disallow anything outside permitted statuses
                              if (process.env.NODE_ENV !== 'production') {
                                   console.warn('[ClientSubscriptionWatcher] Non-active/trialing status on load; signing out', { statusNow });
                              }
                              await supabaseBrowserClient.auth.signOut();
                              router.push('/auth/login');
                              return; // skip setting up realtime if we just signed out
                         }
                    } else { // Read error -> conservative approach: sign out
                         if (process.env.NODE_ENV !== 'production') {
                              console.warn('[ClientSubscriptionWatcher] Failed to read current subscription; treating as non-active', readErr?.message);
                         }
                         await supabaseBrowserClient.auth.signOut();
                         router.push('/auth/login');
                         return;
                    }
               } catch (e) { // Unexpected exception -> also sign out to avoid unauthorized access
                    if (process.env.NODE_ENV !== 'production') {
                         console.error('[ClientSubscriptionWatcher] Error during initial status check', e);
                    }
                    // On unexpected error, be conservative and sign out
                    await supabaseBrowserClient.auth.signOut();
                    router.push('/auth/login');
                    return;
               }

               // Realtime listener: reacts to UPDATE / DELETE events on this client's subscription row
               cleanup = await initClientSubscriptionRealtime(customerId, async (payload: RealtimePostgresChangesPayload<any>) => {

                    log(`[ClientSubscriptionWatcher] Realtime payload ${JSON.stringify({
                         eventType: (payload as any).eventType,
                         new: (payload as any).new,
                         old: (payload as any).old,
                    })}`);

                    try { // Defensive parsing + decision logic
                         const raw = (payload.new || payload.old || {}) as Partial<ClientSubscriptionRow>;
                         const row: ClientSubscriptionRow | null = (raw && typeof raw === 'object')
                              ? {
                                   id: String((raw as any).id || ''),
                                   customerId: String((raw as any).customerId || ''),
                                   status: ((raw as any).status as any) ?? 'active',
                                   next_payment_date: (raw as any).next_payment_date ?? null,
                              }
                              : null;
                         if (!row) return;

                         const status = row.status;
                         const affectedClientId = row.customerId;

                         if (affectedClientId !== customerId) return; // Ignore stray events (shouldn't happen with filter)

                         const isAllowed = status === 'active' || status === 'trialing'; // Allowed statuses that keep the session
                         if ((payload.eventType === "DELETE") || (payload.eventType === "UPDATE" && status && !isAllowed)) { // Any disallowed transition => sign out
                              if (!signingOut) {
                                   signingOut = true;
                                   if (process.env.NODE_ENV !== 'production') {
                                        console.warn('[ClientSubscriptionWatcher] Realtime triggered sign-out', {
                                             eventType: (payload as any).eventType,
                                             status
                                        });
                                   }
                                   await supabaseBrowserClient.auth.signOut();
                                   router.push('/auth/login');
                              }
                              return;
                         }
                    } catch (e) { // Realtime handler failure shouldn't crash app; log only in dev
                         log(`[ClientSubscriptionWatcher] error handling payload: ${JSON.stringify(payload)}`, 'error');
                    }
               });

               // Additional realtime listener for tblCustomers status (account status gate separate from subscription)
               try {
                    clientStatusChannel = supabaseBrowserClient
                         .channel(`customer-status-${customerId}`)
                         .on('postgres_changes', {
                              event: '*',
                              schema: 'public',
                              table: TABLES.POLAR_CUSTOMERS,
                              filter: `id=eq.${customerId}`,
                         }, async (payload: any) => {
                              if (signingOut) return;
                              try {
                                   const newRow = payload.new || payload.old;
                                   const client_status = newRow?.client_status;

                                   log(`[ClientSubscriptionWatcher] Client status realtime ${JSON.stringify({ client_status, eventType: payload.eventType })}`);

                                   if (client_status && client_status !== 'active') {
                                        signingOut = true;

                                        log(`[ClientSubscriptionWatcher] Client status changed to non-active; signing out`, 'warn');

                                        await supabaseBrowserClient.auth.signOut();
                                        router.push('/auth/login');
                                   }
                              } catch (e) {
                                   log('[ClientSubscriptionWatcher] Error handling client status payload', e);
                              }
                         })
                         .subscribe(status => {
                              log(`[ClientSubscriptionWatcher] Client status channel subscribed ${status}`);
                         });
               } catch (e) {
                    log(`[ClientSubscriptionWatcher] Failed to init client status channel ${e}`, 'error');
               }

               // Polling fallback: executes every 15s to cover missed realtime events or network hiccups
               intervalId = setInterval(async () => {
                    if (signingOut) return; // already processing sign-out

                    log('[ClientSubscriptionWatcher] Poll tick');

                    try {
                         const { data: current, error: readErr } = await supabaseBrowserClient
                              .from(TABLES.POLAR_SUBSCRIPTIONS)
                              .select('status')
                              .eq('customerId', customerId)
                              .single();
                         if (!readErr) { // Got current subscription snapshot
                              const statusNow = (current as any)?.status as string | undefined;
                              const pollAllowed = statusNow === 'active' || statusNow === 'trialing'; // Mirror realtime allowed logic
                              if (!statusNow || !pollAllowed) { // Missing row or disallowed status -> sign out
                                   if (process.env.NODE_ENV !== 'production') {
                                        console.warn('[ClientSubscriptionWatcher] Poll detected non-active/trialing; signing out', { statusNow });
                                   }
                                   if (!signingOut) {
                                        signingOut = true;
                                        await supabaseBrowserClient.auth.signOut();
                                        router.push('/auth/login');
                                   }
                              }
                         }
                    } catch (_e) { // Ignore transient polling errors; next tick may succeed
                         // ignore; rely on next tick
                    }
               }, 15000);
          }

          start();

          return () => { // Cleanup on unmount or customerId change
               cancelled = true;
               if (cleanup) cleanup().catch(() => { });
               if (intervalId) clearInterval(intervalId);
               if (clientStatusChannel) {
                    try { supabaseBrowserClient.removeChannel(clientStatusChannel); } catch { }
               }
          };
     }, [customerId]);

     return null; // No UI rendered; purely behavioral component
}
