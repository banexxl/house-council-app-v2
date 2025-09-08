"use client";

import { supabaseBrowserClient } from "src/libs/supabase/sb-client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type AnyChannel = RealtimeChannel & {
     on: (
          type: "postgres_changes",
          filter: { event: "*" | "INSERT" | "UPDATE" | "DELETE"; schema: string; table: string; filter?: string },
          callback: (payload: any) => void
     ) => AnyChannel;
};

interface InitListenerOptions<T extends Record<string, any> = Record<string, any>> {
     schema?: string;                 // default 'public'
     channelName?: string;            // fixed name optional
     filter?: string;                 // e.g. "user_id=eq.<uuid>"
     onEvent: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/** Wait until we have an authenticated session (so the WS uses an auth JWT, not anon). */
async function waitForSessionJwt(): Promise<string | null> {
     const { data } = await supabaseBrowserClient.auth.getSession();
     if (data.session?.access_token) return data.session.access_token;

     return new Promise((resolve) => {
          const { data: sub } = supabaseBrowserClient.auth.onAuthStateChange((_e, session) => {
               if (session?.access_token) {
                    sub.subscription.unsubscribe();
                    resolve(session.access_token);
               }
          });
     });
}

/** Subscribe to a table (INSERT/UPDATE/DELETE). Returns an async cleanup fn. */
export async function initTableRealtimeListener<T extends Record<string, any> = Record<string, any>>(
     table: string,
     events: Array<"INSERT" | "UPDATE" | "DELETE"> = ["INSERT", "UPDATE", "DELETE"],
     { schema = "public", channelName, filter, onEvent }: InitListenerOptions<T>
): Promise<() => Promise<void>> {
     // 1) Ensure WS is authenticated
     const jwt = await waitForSessionJwt();
     if (jwt) {
          // keep WS auth in sync (defensive; SDK usually does this automatically)
          (supabaseBrowserClient.realtime as any)?.setAuth?.(jwt);
     }

     // 2) Channel
     const name = channelName || `rt-${schema}-${table}-${Math.random().toString(36).slice(2, 9)}`;
     const channel = supabaseBrowserClient.channel(name) as AnyChannel;

     // 3) Attach listeners (no empty filter!)
     const base = { schema, table } as const;
     const f = (filter && filter.trim()) ? { filter } : {};
     for (const ev of events) {
          (channel as AnyChannel).on("postgres_changes", { event: ev, ...base, ...f }, (payload: any) => {
               // dev log
               if (process.env.NODE_ENV !== "production") {
                    console.log(`[${table}] evt=${payload.eventType}`, { id: payload.new?.id ?? payload.old?.id, payload });
               }
               onEvent(payload as RealtimePostgresChangesPayload<T>);
          });
     }

     // 4) Subscribe (with status logs)
     channel.subscribe((status) => {
          if (process.env.NODE_ENV !== "production") {
               console.log(`[${table}] channel status: ${status}`);
          }
     });

     // 5) Cleanup
     return async () => {
          await supabaseBrowserClient.removeChannel(channel);
     };
}

// Helpers (NO empty filter)
export const initNotificationsRealtime = (onEvent: InitListenerOptions["onEvent"]) =>
     initTableRealtimeListener("tblNotifications", ["INSERT", "UPDATE", "DELETE"], {
          schema: "public",
          channelName: "notifications_topic",
          onEvent,
     });
