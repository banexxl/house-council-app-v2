'use server'

import { revalidatePath } from "next/cache";
import { supabase } from "src/libs/supabase/sb-client";
import { BaseEntity } from "src/types/base-entity";
import { generateSlug } from "src/utils/url-creator";

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
     let insertData = { ...entity };
     if (table === 'tblFeatures') {
          insertData = { ...insertData, slug: generateSlug(entity.name) };
     }
     const { data, error } = await supabase.from(table).insert(insertData).select().single();

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

     if (!table.trim()) {
          return { success: false, error: 'clients.clientSettingsNoTableError' };
     }

     if (!entity || Object.keys(entity).length === 0) {
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (entity.name!.trim() === '') {
          return { success: false, error: 'clients.clientSettingsNoNameError' };
     }

     // Check if name already exists, ignoring case, but ignore current entry
     const { data: existingEntity, error: readError } = await supabase
          .from(table)
          .select('id')
          .ilike('name', entity.name!.trim())
          .neq('id', id)
          .single();

     // If an existing entity is found, return an error
     if (existingEntity) {
          return { success: false, error: 'clients.clientSettingsAlreadyExists' };
     }

     const { data, error } = await supabase.from(table)
          .update({
               ...entity,
               ...(table === 'tblFeatures' && entity.name && { slug: generateSlug(entity.name.trim()) }),
          })
          .eq('id', id)
          .select()
          .single();

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
     const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('name', { ascending: true });

     if (error) {
          console.error(`Error fetching entities from ${table}:`, error);
          return [];
     }

     return data;
};
