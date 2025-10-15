"use server";

import { Session, User } from '@supabase/supabase-js'
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server'
import { Client, ClientMember } from 'src/types/client'
import { Tenant } from 'src/types/tenant'
import { Admin } from 'src/types/admin'
import { cache } from 'react';
import { TABLES } from 'src/config/tables';

export type UserDataCombined = {
     client: Client | null
     clientMember: ClientMember | null
     tenant: Tenant | null
     admin: Admin | null
     userData: User | null
     error?: string
}

/**
 * One call per request; all RSCs share via React's cache()
 * - Reads session/user from cookie-bound client (auth)
 * - Uses your service-role client for cross-table lookups
 * - Runs role lookups in parallel, prefers first non-null in priority order
 */
export const getViewer = cache(async (): Promise<UserDataCombined> => {
     // Auth (cookie-aware) — do NOT use service role for reading the session
     const authSb = await useServerSideSupabaseAnonClient();
     const { data: { user }, error: userErr } = await authSb.auth.getUser();

     if (userErr || !user) {
          return {
               client: null,
               clientMember: null,
               tenant: null,
               admin: null,
               userData: null,
               error: userErr?.message || 'Failed to authenticate user',
          };
     }

     // DB lookups (you already use service role; keep it if you need to bypass RLS)
     const db = await useServerSideSupabaseServiceRoleClient();

     // Helper that returns null instead of throwing for "no rows"
     const maybeSingle = <T,>(q: any) =>
          q.single().then((r: any) => r.data as T).catch((e: any) => {
               // PGRST116 = No rows found
               if (e?.code === 'PGRST116') return null;
               throw e;
          });

     // Run in parallel
     const [client, clientMember, tenant, admin] = await Promise.all([
          maybeSingle(db.from(TABLES.CLIENTS).select('*').eq('user_id', user.id)),
          maybeSingle(db.from(TABLES.CLIENT_MEMBERS).select('*').eq('user_id', user.id)),
          maybeSingle(db.from(TABLES.TENANTS).select('*').eq('user_id', user.id)),
          maybeSingle(db.from(TABLES.SUPER_ADMINS).select('*').eq('user_id', user.id)),
     ]).catch((err) => {
          return [null, null, null, null] as const;
     });

     // Choose the first matching role by your preferred priority
     const result: UserDataCombined = {
          client,
          clientMember,
          tenant,
          admin,
          userData: user,
     };

     if (!client && !clientMember && !tenant && !admin) {
          result.error = 'User record not found';
     }

     return result;
});
