"use server";

import { User } from '@supabase/supabase-js'
import { useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server'
import { Client, ClientMember } from 'src/types/client'
import { Tenant } from 'src/types/tenant'
import { Admin } from 'src/types/admin'

export type UserDataCombined = {
     client: Client | null
     clientMember: ClientMember | null
     tenant: Tenant | null
     admin: Admin | null
     userData: User | null
     error?: string
}

export const checkIfUserExistsAndReturnDataAndSessionObject = async (): Promise<UserDataCombined> => {

     const supabase = await useServerSideSupabaseServiceRoleClient();

     // ✅ 1. Get current user from Supabase Auth
     const { data: userData, error: userError } = await supabase.auth.getUser();

     if (userError || !userData?.user) {
          return {
               client: null,
               clientMember: null,
               tenant: null,
               admin: null,
               userData: null,
               error: userError?.message || 'Failed to authenticate user',
          };
     }

     const user = userData.user;

     // ✅ 2. Look up tblClients by user_id
     const { data: client, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('user_id', user.id)
          .single();

     if (client) {
          return { client, clientMember: null, tenant: null, admin: null, userData: user };
     }

     if (clientError && clientError.code !== 'PGRST116') {
          return {
               client: null,
               clientMember: null,
               tenant: null,
               admin: null,
               userData: user,
               error: clientError.message,
          };
     }

     // ✅ 2. Look up tblClientMembers by user_id
     const { data: clientMember, error: clientMemberError } = await supabase
          .from('tblClientMembers')
          .select('*')
          .eq('user_id', user.id)
          .single();

     if (clientMember) {
          return { client: null, clientMember, tenant: null, admin: null, userData: user };
     }

     if (clientMemberError && clientMemberError.code !== 'PGRST116') {
          return {
               client: null,
               clientMember,
               tenant: null,
               admin: null,
               userData: user,
               error: clientMemberError.message,
          };
     }

     // ✅ 3. Look up tblTenants by user_id
     const { data: tenant, error: tenantError } = await supabase
          .from('tblTenants')
          .select('*')
          .eq('user_id', user.id)
          .single();

     if (tenant) {
          return { client: null, clientMember: null, tenant, admin: null, userData: user };
     }

     if (tenantError && tenantError.code !== 'PGRST116') {
          return {
               client: null,
               clientMember: null,
               tenant: null,
               admin: null,
               userData: user,
               error: tenantError.message,
          };
     }

     // ✅ 4. Look up tblSuperAdmins by user_id
     const { data: admin, error: adminError } = await supabase
          .from('tblSuperAdmins')
          .select('*')
          .eq('user_id', user.id)
          .single();

     if (admin) {
          return { client: null, clientMember: null, tenant: null, admin, userData: user };
     }

     if (adminError && adminError.code !== 'PGRST116') {
          return {
               client: null,
               clientMember: null,
               tenant: null,
               admin: null,
               userData: user,
               error: adminError.message,
          };
     }

     return { client: null, clientMember: null, tenant: null, admin: null, userData: user, error: 'User record not found' };
};
