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
               // Example payload structure:
               // {
               //   "schema": "public",
               //   "table": "tblNotifications",
               //   "commit_timestamp": "2025-09-08T19:40:08.889Z",
               //   "eventType": "INSERT",
               //   "new": {
               //     "id": "e56fe9e5-4d71-4394-aef9-5d492efeaf71",
               //     "title": "Announcement deleted",
               //     "description": "Announcement 7d2bc3bf-6851-4302-8e29-38bb5c02bb6b was deleted",
               //     "type": "announcement",
               //     "announcement_id": null,
               //     "user_id": "9a6cb857-acea-458a-a800-34acfb816117",
               //     "is_read": false,
               //     "is_scheduled": null,
               //     "scheduled_for": null,
               //     "sender_id": null,
               //     "receiver_id": null,
               //     "severity": null,
               //     "created_at": "2025-09-08T19:40:10.931+00:00"
               //   },
               //   "old": {},
               //   "errors": null
               // }
               onEvent(payload as RealtimePostgresChangesPayload<T>);
          });
     }

     // 4) Subscribe (with status logs)
     channel.subscribe((status) => {
          if (process.env.NODE_ENV !== "production") {
               console.log(`Channel status: ${status}`);
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

/**
 * Listen to announcements being published, and notify only when they target any of the provided building ids.
 * This subscribes to tblAnnouncements UPDATE events and filters for transitions to published.
 */
export async function initAnnouncementsRealtimeForBuildings(
     buildingIds: string[],
     onEvent: InitListenerOptions["onEvent"]
): Promise<() => Promise<void>> {
     if (!Array.isArray(buildingIds) || buildingIds.length === 0) {
          return async () => { };
     }

     const buildingSet = new Set(buildingIds);

     const cleanup = await initTableRealtimeListener("tblAnnouncements", ["UPDATE"], {
          schema: "public",
          channelName: "announcements_updates",
          // server-side filter to reduce noise; client will still verify transition
          filter: "status=eq.published",
          onEvent: async (payload: any) => {
               const oldStatus = payload?.old?.status;
               const newStatus = payload?.new?.status;
               // Only react to transitions to published
               if (newStatus !== "published" || oldStatus === "published") return;
               const announcementId = payload?.new?.id;
               if (!announcementId) return;
               // Check pivot: is this announcement linked to any of our buildings?
               const { data, error } = await supabaseBrowserClient
                    .from("tblBuildings_Announcements")
                    .select("building_id")
                    .eq("announcement_id", announcementId);
               if (error) return;
               const targetsTenant = (data || []).some((r: any) => buildingSet.has(r.building_id));
               if (!targetsTenant) return;
               onEvent(payload);
          },
     });

     return cleanup;
}
