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
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          const { error } = await supabase
               .from('tblClientMembers')
               .delete()
               .eq('id', id);
          if (error) throw error;
          return { deleteClientMemberSuccess: true };
     } catch (error: any) {
          return { deleteClientMemberSuccess: false, deleteClientMemberError: error.message };
     }
};

export const readAllClientTeamMembers = async (clientId: string): Promise<{ readAllClientTeamMembersSuccess: boolean; readAllClientTeamMembersData?: ClientMember[]; readAllClientTeamMembersError?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase
               .from('tblClientMembers')
               .select('*')
               .eq('client_id', clientId);
          console.log('error:', error);

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
          const { error: createUserError } = await adminSupabase.auth.admin.createUser({ email });

          if (createUserError) throw createUserError;
          const { error: insertError } = await supabase
               .from('tblClientMembers')
               .insert({
                    email,
                    name,
                    client_id
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