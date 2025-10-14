'use server'

import { revalidatePath } from "next/cache";
import { TABLES } from "src/config/tables";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { Feature } from "src/types/base-entity";

export const updateFeature = async (id: string, feature: Partial<Feature>): Promise<{ success: boolean; updatedFeature?: Feature; error?: any }> => {

     const supabase = await useServerSideSupabaseAnonClient();

     if (!feature || Object.keys(feature).length === 0) {
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (feature.name?.trim() === '') {
          return { success: false, error: 'clients.clientSettingsNoNameError' };
     }

     if (feature.name) {
          const { data: existingFeature } = await supabase
               .from(TABLES.FEATURES)
               .select('id')
               .ilike('name', feature.name.trim())
               .neq('id', id)
               .single();

          if (existingFeature) {
               return { success: false, error: 'clients.clientSettingsAlreadyExists' };
          }
     }

     const { data, error } = await supabase
          .from(TABLES.FEATURES)
          .update(feature)
          .eq('id', id)
          .select()
          .single();

     if (error) {
          return { success: false, error };
     }

     revalidatePath('/dashboard/subscriptions/');
     return { success: true, updatedFeature: data };
};