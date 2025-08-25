'use server'

import { revalidatePath } from "next/cache";
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from "src/libs/supabase/sb-server";
import { ClientMember } from "src/types/client";

export const createOrUpdateClientMember = async (member: ClientMember): Promise<{ createOrUpdateClientMemberSuccess: boolean; createdOrUpdatedMember?: ClientMember; createOrUpdateClientMemberError?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     try {
          let data, error;
          if (member.id) {
               // Update existing member
               ({ data, error } = await supabase
                    .from('tblClientMembers')
                    .update(member)
                    .eq('id', member.id)
                    .select()
                    .single());
          } else {
               // Create new member
               ({ data, error } = await supabase
                    .from('tblClientMembers')
                    .insert(member)
                    .select()
                    .single());
          }
          if (error) throw error;
          return { createOrUpdateClientMemberSuccess: true, createdOrUpdatedMember: data };
     } catch (error: any) {
          return { createOrUpdateClientMemberSuccess: false, createOrUpdateClientMemberError: error.message };
     }
};

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
     console.log('Deleting client member with ID:', id);

     const supabaseAdmin = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data: tenantToDelete, error: fetchError } = await supabaseAdmin
               .from('tblClientMembers')
               .select('user_id')
               .eq('id', id)
               .single();
          console.log('error:', fetchError);

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