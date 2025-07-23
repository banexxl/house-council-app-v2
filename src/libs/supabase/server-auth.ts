"use server";

import { User } from '@supabase/supabase-js'
import { useServerSideSupabaseAnonClient } from 'src/libs/supabase/sb-server'
import { Client } from 'src/types/client'
import { Tenant } from 'src/types/tenant'
import { Admin } from 'src/types/admin'

export type UserDataCombined = {
     client: Client | null
     tenant: Tenant | null
     admin: Admin | null
     userData: User | null
     role: 'client' | 'tenant' | 'admin' | null
     error?: string
}

export const checkIfUserExistsAndReturnDataAndSessionObject =
     async (): Promise<UserDataCombined> => {
          const supabase = await useServerSideSupabaseAnonClient();

          // ✅ 1. Get current user from Supabase Auth
          const { data: userData, error: userError } = await supabase.auth.getUser();

          if (userError || !userData?.user) {
               return {
                    client: null,
                    tenant: null,
                    admin: null,
                    userData: null,
                    role: null,
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
               return { client, tenant: null, admin: null, userData: user, role: 'client' };
          }

          if (clientError && clientError.code !== 'PGRST116') {
               return {
                    client: null,
                    tenant: null,
                    admin: null,
                    userData: user,
                    role: null,
                    error: clientError.message,
               };
          }

          // ✅ 3. Look up tblTenants by user_id
          const { data: tenant, error: tenantError } = await supabase
               .from('tblTenants')
               .select('*')
               .eq('user_id', user.id)
               .single();

          if (tenant) {
               return { client: null, tenant, admin: null, userData: user, role: 'tenant' };
          }

          if (tenantError && tenantError.code !== 'PGRST116') {
               return {
                    client: null,
                    tenant: null,
                    admin: null,
                    userData: user,
                    role: null,
                    error: tenantError.message,
               };
          }

          // ✅ 4. Look up tblAdmins by user_id
          const { data: admin, error: adminError } = await supabase
               .from('tblAdmins')
               .select('*')
               .eq('user_id', user.id)
               .single();

          if (admin) {
               return { client: null, tenant: null, admin, userData: user, role: 'admin' };
          }

          if (adminError && adminError.code !== 'PGRST116') {
               return {
                    client: null,
                    tenant: null,
                    admin: null,
                    userData: user,
                    role: null,
                    error: adminError.message,
               };
          }

          return { client: null, tenant: null, admin: null, userData: user, role: null, error: 'User record not found' };
     };
