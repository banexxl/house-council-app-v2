
"use client";

import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

<<<<<<< HEAD
// Supported individual table events (Supabase currently exposes these)
export type TableEvent = 'INSERT' | 'UPDATE' | 'DELETE';
// Allow requesting a wildcard in the public API for simplicity
type TableEventOrWildcard = TableEvent | '*';

export interface InitListenerOptions<TRecord extends Record<string, unknown> = Record<string, unknown>> {
     schema?: string;                 // Postgres schema (default 'public')
     channelName?: string;            // Optional deterministic channel name (else random)
     filter?: string;                 // Optional replication filter (e.g. "id=eq.123")
     onEvent: (payload: RealtimePostgresChangesPayload<TRecord>) => void;
     onStatusChange?: (status: string) => void; // Optional status callback (uses string for wider compatibility)
}

/**
 * Subscribes to realtime changes for a Postgres table.
 * - If events includes '*' (or all three events are provided) a single wildcard subscription is used.
 * - Otherwise individual subscriptions are created per event.
 * Returns an async cleanup function that removes the channel.
 */
export function initTableRealtimeListener<TRow extends Record<string, unknown> = Record<string, unknown>>(
     table: string,
     events: TableEventOrWildcard[] = ['*'],
     { schema = 'public', channelName, filter, onEvent, onStatusChange }: InitListenerOptions<TRow>
): () => Promise<void> {

     const resolvedEvents: TableEventOrWildcard[] = normalizeEvents(events);
     const name = channelName || `rt-${schema}-${table}-${Math.random().toString(36).slice(2, 9)}`;
     const channel: RealtimeChannel = supabaseBrowserClient.channel(name);

     const handler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Narrow payload to caller's expected row shape (no 'any' usage)
          onEvent(payload as RealtimePostgresChangesPayload<TRow>);
     };

     // If wildcard present (or effectively all events), subscribe once with '*'
     if (resolvedEvents.includes('*')) {
          onPostgresChanges(channel, { event: '*', schema, table, ...(filter ? { filter } : {}) }, handler);
     } else {
          // Individual event subscriptions
          for (const ev of resolvedEvents) {
               onPostgresChanges(channel, { event: ev as TableEvent, schema, table, ...(filter ? { filter } : {}) }, handler);
          }
     }

     channel.subscribe((status) => {
          const statusStr = String(status);
          onStatusChange?.(statusStr);
=======
export type TableEvent = 'INSERT' | 'UPDATE' | 'DELETE';

type AnyChannel = RealtimeChannel & {
     on: (
          type: 'postgres_changes',
          filter: { event: '*' | 'INSERT' | 'UPDATE' | 'DELETE'; schema?: string; table?: string; filter?: string },
          callback: (payload: any) => void
     ) => AnyChannel;
};

interface InitListenerOptions<T extends Record<string, any> = Record<string, any>> {
     schema?: string;                 // default 'public'
     channelName?: string;            // optional custom channel name
     filter?: string;                 // e.g. "id=eq.123" (optional - Postgres replication filter)
     onEvent: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Initialize a realtime listener for a specific table & list of events.
 * Returns an async cleanup function to unsubscribe.
 *
 * Example:
 * const stop = await initTableRealtimeListener('tblAnnouncements', ['INSERT','UPDATE'], { onEvent: cb });
 * ... later await stop();
 */
export function initTableRealtimeListener<T extends Record<string, any> = Record<string, any>>(
     table: string,
     events: TableEvent[] = ['INSERT', 'UPDATE', 'DELETE'],
     { schema = 'public', channelName, filter, onEvent }: InitListenerOptions<T>
) {
     const name = channelName || `rt-${schema}-${table}-${Math.random().toString(36).slice(2, 9)}`;
     const channel = supabaseBrowserClient.channel(name) as AnyChannel;

     channel.on('postgres_changes', { event: '*', schema, table }, onEvent as any);

     channel.subscribe((status: string) => {
          console.log(`[${table}] channel status:`, status);
>>>>>>> ova verzija RRAAADDIIIII
     });

     return async () => {
          await supabaseBrowserClient.removeChannel(channel);
     };
}

<<<<<<< HEAD
/** Normalize requested events to either ['*'] or a deduplicated subset */
function normalizeEvents(events: TableEventOrWildcard[]): TableEventOrWildcard[] {
     if (events.length === 0) return ['*'];
     const unique = Array.from(new Set(events));
     if (unique.includes('*')) return ['*'];
     // If caller passed all 3 explicit events, collapse to wildcard for efficiency
     const all: TableEvent[] = ['INSERT', 'UPDATE', 'DELETE'];
     const hasAll = all.every(ev => unique.includes(ev));
     return hasAll ? ['*'] : (unique as TableEvent[]);
}

// Strongly-typed helper to avoid using 'any' while working around potential library overload resolution issues.
interface PostgresChangesFilterBase {
     schema: string;
     table?: string;
     filter?: string;
}
interface PostgresChangesFilterWildcard extends PostgresChangesFilterBase { event: '*'; }
interface PostgresChangesFilterEvent extends PostgresChangesFilterBase { event: TableEvent; }
type PostgresChangesFilter = PostgresChangesFilterWildcard | PostgresChangesFilterEvent;

function onPostgresChanges<TRow extends Record<string, unknown>>(
     channel: RealtimeChannel,
     filter: PostgresChangesFilter,
     cb: (payload: RealtimePostgresChangesPayload<TRow>) => void
) {
     (channel as {
          on: (
               type: 'postgres_changes',
               filter: PostgresChangesFilter,
               callback: (payload: RealtimePostgresChangesPayload<TRow>) => void
          ) => RealtimeChannel;
     }).on('postgres_changes', filter, cb);
}

// Convenience helpers (fixed channel names for stability across mounts)
export const initAnnouncementsRealtime = (onEvent: InitListenerOptions['onEvent']) =>
     initTableRealtimeListener('tblAnnouncements', ['*'], { schema: 'public', channelName: 'announcements_topic', onEvent });

export const initBuildingsRealtime = (onEvent: InitListenerOptions['onEvent']) =>
     initTableRealtimeListener('tblBuildings', ['*'], { schema: 'public', channelName: 'buildings_topic', onEvent });
=======

// Convenience helper specific to announcements (keeps previous behavior)
export const initAnnouncementsRealtime = (onEvent: InitListenerOptions['onEvent']) =>
     initTableRealtimeListener('tblAnnouncements', ['INSERT', 'UPDATE', 'DELETE'], { schema: 'public', channelName: 'announcements_topic', filter: '', onEvent });

export const initBuildingsRealtime = (onEvent: InitListenerOptions['onEvent']) =>
     initTableRealtimeListener('tblBuildings', ['INSERT', 'UPDATE', 'DELETE'], { schema: 'public', channelName: 'buildings_topic', filter: '', onEvent });
>>>>>>> ova verzija RRAAADDIIIII
