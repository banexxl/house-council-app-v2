'use server'

import { revalidatePath } from "next/cache";
import { supabase } from "src/libs/supabase/client";

export interface BaseEntity {
     id?: string;
     created_at?: string;
     updated_at?: string;
     name: string;
     description?: string;
}

export const createEntity = async <T extends BaseEntity>(table: string, entity: T): Promise<{ success: boolean; createdEntity?: T; error?: any }> => {
     if (!table.trim()) {
          return { success: false, error: 'clients.clientSettingsNoTableError' };
     }

     if (!entity || Object.keys(entity).length === 0) {
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (entity.name.trim() === '') {
          return { success: false, error: 'clients.clientSettingsNoNameError' };
     }

     // Check if name already exists, ignoring case
     const { data: existingEntity, error: readError } = await supabase
          .from(table)
          .select('id')
          .ilike('name', entity.name.trim())
          .single();

     // If an existing entity is found, return an error
     if (existingEntity) {
          return { success: false, error: 'clients.clientSettingsAlreadyExists' };
     }

     // Proceed with insertion since no existing entity was found
     const { data, error } = await supabase.from(table).insert(entity).select().single();

     if (error) {
          return { success: false, error };
     }

     revalidatePath('/dashboard/clients/client-settings');
     return { success: true, createdEntity: data };

};

export const readEntity = async <T extends BaseEntity>(table: string, id: string): Promise<{ success: boolean, entity?: T, error?: string }> => {
     const { data, error } = await supabase.from(table).select('*').eq('id', id).single();

     if (error) {
          return { success: false, error: error.message };
     }

     return { success: true, entity: data };
};

export const updateEntity = async <T extends BaseEntity>(table: string, id: string, entity: Partial<T>): Promise<{ success: boolean, updatedEntity?: T, error?: any }> => {

     const { data, error } = await supabase.from(table).update(entity).eq('id', id).select().single();

     if (error) {
          return { success: false, error };
     }

     revalidatePath('/dashboard/clients/client-settings');
     return { success: true, updatedEntity: data };
};

export const deleteEntity = async (table: string, id: string): Promise<{ success: boolean, error?: string }> => {
     const { error } = await supabase.from(table).delete().eq('id', id);

     if (error) {
          return { success: false, error: error.message };
     }

     revalidatePath('/dashboard/clients/client-settings');
     return { success: true };
};

export const readAllEntities = async <T extends BaseEntity>(table: string): Promise<T[]> => {
     const { data, error } = await supabase.from(table).select('*').order('updated_at', { ascending: false });

     if (error) {
          console.error(`Error fetching entities from ${table}:`, error);
          return [];
     }

     return data;
};
