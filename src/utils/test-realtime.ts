'use client';

import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { TABLES } from 'src/libs/supabase/tables';

/**
 * Test function to verify real-time subscriptions are working
 * Call this from browser console: testRealtime()
 */
export const testRealtime = () => {
     console.log('🔧 Testing real-time subscriptions...');

     const channel = supabaseBrowserClient
          .channel('test-chat-realtime')
          .on('postgres_changes',
               {
                    event: 'INSERT',
                    schema: 'public',
                    table: TABLES.CHAT_MESSAGES
               },
               (payload) => {
                    console.log('✅ Real-time message INSERT detected:', payload);
               }
          )
          .on('postgres_changes',
               {
                    event: 'UPDATE',
                    schema: 'public',
                    table: TABLES.CHAT_ROOMS
               },
               (payload) => {
                    console.log('✅ Real-time room UPDATE detected:', payload);
               }
          )
          .subscribe((status) => {
               console.log(`🔌 Real-time subscription status: ${status}`);
          });

     console.log('📡 Real-time test subscription created. Send a message to test!');

     // Return cleanup function
     return () => {
          console.log('🧹 Cleaning up test subscription...');
          supabaseBrowserClient.removeChannel(channel);
     };
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
     (window as any).testRealtime = testRealtime;
}