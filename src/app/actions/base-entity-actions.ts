'use server'

import { revalidatePath } from "next/cache";
import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { BaseEntity } from "src/types/base-entity";
import { generateSlug } from "src/utils/url-creator";
import { TABLES } from "src/libs/supabase/tables";

export const createEntity = async <T extends BaseEntity>(table: string, entity: T): Promise<{ success: boolean; createdEntity?: T; error?: any }> => {

     const duration_ms = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     if (!table.trim()) {
          await logServerAction({
               user_id: null,
               action: 'create-entity',
               duration_ms: Date.now() - duration_ms,
               error: 'clients.clientSettingsNoTableError',
               payload: { table, entity },
               status: 'fail',
               type: 'db',


          })
          return { success: false, error: 'clients.clientSettingsNoTableError' };
     }

     if (!entity || Object.keys(entity).length === 0) {
          await logServerAction({
               user_id: null,
               action: 'create-entity',
               duration_ms: Date.now() - duration_ms,
               error: 'clients.clientSettingsNoEntityError',
               payload: { table, entity },
               status: 'fail',
               type: 'db',


          })
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (entity.name.trim() === '') {
          await logServerAction({
               user_id: null,
               action: 'create-entity',
               duration_ms: Date.now() - duration_ms,
               error: 'clients.clientSettingsNoNameError',
               payload: { table, entity },
               status: 'fail',
               type: 'db',


          })
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
          await logServerAction({
               user_id: null,
               action: 'create-entity',
               duration_ms: Date.now() - duration_ms,
               error: 'clients.clientSettingsAlreadyExists',
               payload: { table, entity },
               status: 'fail',
               type: 'db',


          })
          return { success: false, error: 'clients.clientSettingsAlreadyExists' };
     }

     // Proceed with insertion since no existing entity was found
     let insertData = { ...entity };
     if (table === TABLES.FEATURES) {
          insertData = { ...insertData, slug: generateSlug(entity.name) };
     }
     const { data, error } = await supabase.from(table).insert(insertData).select().single();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'create-entity',
               duration_ms: Date.now() - duration_ms,
               error: error.message,
               payload: { table, entity },
               status: 'fail',
               type: 'db',


          })
          return { success: false, error };
     }

     await logServerAction({
          user_id: null,
          action: 'create-entity',
          duration_ms: Date.now() - duration_ms,
          error: '',
          payload: { table, entity },
          status: 'success',
          type: 'db',


     })
     revalidatePath('/dashboard/clients/client-settings');
     return { success: true, createdEntity: data };

};

export const readEntity = async <T extends BaseEntity>(table: string, id: string): Promise<{ success: boolean, entity?: T, error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
     if (error) {
          await logServerAction({
               user_id: null,
               action: 'read-entity',
               duration_ms: Date.now(),
               error: error.message,
               payload: { table, id },
               status: 'fail',
               type: 'db',


          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: null,
          action: 'read-entity',
          duration_ms: Date.now(),
          error: '',
          payload: { table, id },
          status: 'success',
          type: 'db',


     });

     return { success: true, entity: data };
};

export const updateEntity = async <T extends BaseEntity>(table: string, id: string, entity: Partial<T>): Promise<{ success: boolean, updatedEntity?: T, error?: any }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     if (!table.trim()) {
          return { success: false, error: 'clients.clientSettingsNoTableError' };
     }

     if (!entity || Object.keys(entity).length === 0) {
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (entity.name!.trim() === '') {
          return { success: false, error: 'clients.clientSettingsNoNameError' };
     }

     const { data: existingEntity, error: readError } = await supabase
          .from(table)
          .select('id')
          .ilike('name', entity.name!.trim())
          .neq('id', id)
          .single();

     if (existingEntity) {
          return { success: false, error: 'clients.clientSettingsAlreadyExists' };
     }

     const { data, error } = await supabase.from(table)
          .update({
               ...entity,
               ...(table === TABLES.FEATURES && entity.name && { slug: generateSlug(entity.name.trim()) }),
          })
          .eq('id', id)
          .select()
          .single();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'update-entity',
               duration_ms: Date.now(),
               error: error.message,
               payload: { table, id, entity },
               status: 'fail',
               type: 'db',


          });
          return { success: false, error };
     }

     await logServerAction({
          user_id: null,
          action: 'update-entity',
          duration_ms: Date.now(),
          error: '',
          payload: { table, id, entity },
          status: 'success',
          type: 'db',


     });

     revalidatePath('/dashboard/clients/client-settings');
     return { success: true, updatedEntity: data };
};

export const deleteEntity = async (table: string, id: string): Promise<{ success: boolean, error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     const { error } = await supabase.from(table).delete().eq('id', id);

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'delete-entity',
               duration_ms: Date.now(),
               error: error.message,
               payload: { table, id },
               status: 'fail',
               type: 'db',
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: null,
          action: 'delete-entity',
          duration_ms: Date.now(),
          error: '',
          payload: { table, id },
          status: 'success',
          type: 'db',


     });

     revalidatePath('/dashboard/clients/client-settings');
     return { success: true };
};

export const readAllEntities = async <T extends BaseEntity>(table: string): Promise<T[]> => {

     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from(table)
          .select('*')
          .order('name', { ascending: true });

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'read-all-entities',
               duration_ms: Date.now(),
               error: error.message,
               payload: { table },
               status: 'fail',
               type: 'db',


          });
          return [];
     }

     await logServerAction({
          user_id: null,
          action: 'read-all-entities',
          duration_ms: Date.now(),
          error: '',
          payload: { table },
          status: 'success',
          type: 'db',


     });

     return data;
};

