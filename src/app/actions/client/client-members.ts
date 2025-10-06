'use server'

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { Client, ClientMember } from "src/types/client";

export const readClientMember = async (id: string): Promise<{ readClientMemberSuccess: boolean; readClientMemberData?: ClientMember; readClientMemberError?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          const { data, error } = await supabase
               .from('tblClientMembers')
               .select('*')
               .eq('id', id)
               .single();
          if (error) throw error;
          return { readClientMemberSuccess: true, readClientMemberData: data };
     } catch (error: any) {
          return { readClientMemberSuccess: false, readClientMemberError: error.message };
     }
};

export const deleteClientMember = async (id: string): Promise<{ deleteClientMemberSuccess: boolean; deleteClientMemberError?: string }> => {

     const supabaseAdmin = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data: tenantToDelete, error: fetchError } = await supabaseAdmin
               .from('tblClientMembers')
               .select('user_id')
               .eq('id', id)
               .single();

          if (fetchError) {
               return { deleteClientMemberSuccess: false, deleteClientMemberError: fetchError.message };
          }

          const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(tenantToDelete.user_id);
          if (deleteUserError) {
               return { deleteClientMemberSuccess: false, deleteClientMemberError: deleteUserError.message };
          }

          const { error: deleteClientMemberError } = await supabaseAdmin.from('tblClientMembers').delete().eq('id', id);
          if (deleteClientMemberError) {
               return { deleteClientMemberSuccess: false, deleteClientMemberError: deleteClientMemberError.message };
          }

          revalidatePath('/dashboard/tenants');

          return { deleteClientMemberSuccess: true };
     } catch (error: any) {
          return {
               deleteClientMemberSuccess: false,
               deleteClientMemberError: error.message,
          };
     }
};

export const readAllClientTeamMembers = async (clientId: string): Promise<{ readAllClientTeamMembersSuccess: boolean; readAllClientTeamMembersData?: ClientMember[]; readAllClientTeamMembersError?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase
               .from('tblClientMembers')
               .select('*')
               .eq('client_id', clientId);

          if (error) throw error;

          return { readAllClientTeamMembersSuccess: true, readAllClientTeamMembersData: data };
     } catch (error: any) {
          return { readAllClientTeamMembersSuccess: false, readAllClientTeamMembersError: error.message };
     }
};

export const addClientMember = async (email: string, name: string, client_id: string): Promise<{ inviteClientMemberSuccess: boolean; inviteClientMemberError?: string }> => {
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          // 1. Fetch client's subscription_plan_id
          const { data: clientSubscription, error: clientSubError } = await adminSupabase
               .from('tblClient_Subscription')
               .select('subscription_plan_id')
               .eq('client_id', client_id)
               .single();

          if (clientSubError) {
               return { inviteClientMemberSuccess: false, inviteClientMemberError: clientSubError.message };
          }

          if (!clientSubscription?.subscription_plan_id) {
               return { inviteClientMemberSuccess: false, inviteClientMemberError: 'Client subscription not found' };
          }

          // 2. Fetch subscription plan to read max_number_of_team_members
          const { data: subscriptionPlan, error: planError } = await adminSupabase
               .from('tblSubscriptionPlans')
               .select('id, max_number_of_team_members')
               .eq('id', clientSubscription.subscription_plan_id)
               .single();

          if (planError) {
               return { inviteClientMemberSuccess: false, inviteClientMemberError: planError.message };
          }

          // 3. Count existing client members
          const { count: currentCount, error: countError } = await adminSupabase
               .from('tblClientMembers')
               .select('id', { count: 'exact', head: true })
               .eq('client_id', client_id);

          if (countError) {
               return { inviteClientMemberSuccess: false, inviteClientMemberError: countError.message };
          }

          const maxMembers = subscriptionPlan?.max_number_of_team_members ?? 0;
          if (maxMembers > 0 && (currentCount ?? 0) >= maxMembers) {
               return { inviteClientMemberSuccess: false, inviteClientMemberError: 'Maximum number of team members reached for current subscription plan' };
          }

          // 4. Proceed to create auth user & insert member row
          const { data: addedUserData, error: createUserError } = await adminSupabase.auth.admin.createUser({ email });

          if (createUserError) throw createUserError;
          const { error: insertError } = await supabase
               .from('tblClientMembers')
               .insert({
                    email,
                    name,
                    client_id,
                    user_id: addedUserData.user.id!
               });

          if (insertError) throw insertError;
          revalidatePath(`/dashboard/account`);
          return { inviteClientMemberSuccess: true };
     } catch (error: any) {
          return { inviteClientMemberSuccess: false, inviteClientMemberError: error.message };
     }
};

export const resetClientMemberPassword = async (
     email: string,
     newPassword: string,
): Promise<{ success: boolean; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     // Now update the password
     const { error: updateError } = await supabase.auth.updateUser({
          email,
          password: newPassword,
     });
     if (updateError) return { success: false, error: updateError.message };

     return { success: true };
};

// Unified resolver: accept an id that may be either a client member id or already a client id.
// Returns the Client row when found, otherwise returns the original id string as data.
export const readClientOrClientIDFromClientMemberID = async (
     client_id: string
): Promise<{ success: boolean; data?: Client | string; error?: string }> => {

     if (!client_id || client_id.trim() === '') {
          return { success: false, error: 'Invalid client/member ID' };
     }

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: clientData, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('id', client_id)
          .single();

     if (!clientError && clientData) {
          // If we found the client_id just return it
          return { success: true, data: clientData };
     }
     // Attempt to treat id as a client member id second
     const { data: memberRow } = await supabase
          .from('tblClientMembers')
          .select('client_id')
          .eq('id', client_id)
          .single();

     if (!memberRow?.client_id) {
          return { success: false, error: 'Client member nor client not found' };
     }

     return { success: true, data: memberRow.client_id };
};

export const readClientFromClientMemberID = async (
     clientMemberID: string
): Promise<{ success: boolean; data?: Client; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: memberRow, error: memberError } = await supabase
          .from('tblClientMembers')
          .select('client_id')
          .eq('id', clientMemberID)
          .single();

     if (memberError || !memberRow) {
          return { success: false, error: memberError?.message || 'Client member not found' };
     }

     const { data: clientData, error: clientError } = await supabase
          .from('tblClients')
          .select('*')
          .eq('id', memberRow.client_id)
          .single();

     if (clientError || !clientData) {
          return { success: false, error: clientError?.message || 'Client not found' };
     }

     return { success: true, data: clientData };
};