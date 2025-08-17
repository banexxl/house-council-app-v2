'use server'

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

          if (error) throw error;

          return { readAllClientTeamMembersSuccess: true, readAllClientTeamMembersData: data };
     } catch (error: any) {
          return { readAllClientTeamMembersSuccess: false, readAllClientTeamMembersError: error.message };
     }
};

export const inviteClientMemberByResettingPassword = async (email: string, client_id: string): Promise<{ inviteClientMemberSuccess: boolean; inviteClientMemberError?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     const url = `${process.env.NEXT_PUBLIC_SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL!}?role=client_member&client_id=${client_id}`;

     try {
          await adminSupabase.auth.admin.inviteUserByEmail(email)
               .then(async ({ error: inviteError }) => {
                    if (inviteError) throw inviteError;
                    const { error: resetPasswordError } = await supabase.auth.resetPasswordForEmail(email, {
                         redirectTo: url.toString(),
                    });
                    console.log('error:', resetPasswordError);

                    if (resetPasswordError) throw resetPasswordError;
               });

          return { inviteClientMemberSuccess: true };
     } catch (error: any) {
          return { inviteClientMemberSuccess: false, inviteClientMemberError: error.message };
     }
};

export const resetClientMemberPassword = async (
     email: string,
     newPassword: string,
     client_id: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     // Now update the password
     const { error: updateError } = await supabase.auth.updateUser({
          email,
          password: newPassword,
     });
     if (updateError) return { success: false, error: updateError.message };
     //Insert into tblClientMembers name, email and client_id
     const { error: insertError } = await adminSupabase
          .from('tblClientMembers')
          .insert({
               name: email.split('@')[0],
               email,
               client_id
          });

     if (insertError) return { success: false, error: insertError.message };

     return { success: true };
};