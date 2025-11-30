'use server';

import { createClient } from '@supabase/supabase-js';
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { getViewer } from 'src/libs/supabase/server-auth';
import log from 'src/utils/logger';

export const changePassword = async ({
     currentPassword,
     newPassword,
}: {
     currentPassword: string;
     newPassword: string;
}): Promise<{ success: boolean; error?: string }> => {
     if (!currentPassword?.trim() || !newPassword?.trim()) {
          return { success: false, error: 'All fields are required' };
     }

     const viewer = await getViewer();
     const email = viewer.userData?.email;
     const userId = viewer.userData?.id;

     if (!email || !userId) {
          return { success: false, error: 'Not authenticated' };
     }

     try {
          // Verify current password using a standalone client to avoid mutating the session cookies.
          const verifyClient = createClient(process.env.SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
          const { error: verifyError } = await verifyClient.auth.signInWithPassword({
               email,
               password: currentPassword,
          });

          if (verifyError) {
               return { success: false, error: 'Current password is incorrect' };
          }
     } catch (e: any) {
          log(`Change Password - verification failed: ${e?.message || e}`);
          return { success: false, error: 'Unable to verify current password' };
     }

     const adminClient = await useServerSideSupabaseServiceRoleClient();
     const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
          password: newPassword,
     });

     if (updateError) {
          log(`Change Password - update failed: ${updateError.message}`);
          return { success: false, error: updateError.message || 'Failed to update password' };
     }

     return { success: true };
};
