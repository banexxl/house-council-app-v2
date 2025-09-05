
"use client";

import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
     });

     return async () => {
          await supabaseBrowserClient.removeChannel(channel);
     };
}


// Convenience helper specific to announcements (keeps previous behavior)
export const initAnnouncementsRealtime = (onEvent: InitListenerOptions['onEvent']) =>
     initTableRealtimeListener('tblAnnouncements', ['INSERT', 'UPDATE', 'DELETE'], { schema: 'public', channelName: 'announcements_topic', filter: '', onEvent });

export const initBuildingsRealtime = (onEvent: InitListenerOptions['onEvent']) =>
     initTableRealtimeListener('tblBuildings', ['INSERT', 'UPDATE', 'DELETE'], { schema: 'public', channelName: 'buildings_topic', filter: '', onEvent });