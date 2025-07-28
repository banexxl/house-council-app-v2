'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InviteUserPage() {
     const router = useRouter();

     useEffect(() => {
          const fragment = new URLSearchParams(window.location.hash.substring(1));
          const access_token = fragment.get('access_token');
          const refresh_token = fragment.get('refresh_token');

          if (access_token && refresh_token) {
               supabase.auth
                    .setSession({ access_token, refresh_token })
                    .then(({ error }) => {
                         if (error) {
                              console.error('Session setup failed:', error.message);
                              router.replace('/auth/error'); // optional error page
                         } else {
                              router.replace('/'); // success: redirect to home or dashboard
                         }
                    });
          } else {
               console.warn('Missing tokens in URL fragment');
               router.replace('/auth/error');
          }
     }, [router]);

     return null; // No UI needed
}
