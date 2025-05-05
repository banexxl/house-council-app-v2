'use server'

import { revalidatePath } from "next/cache";
import { supabase } from "src/libs/supabase/client";
import { BaseEntity, FeatureExtension } from "src/types/base-entity";

export type Feature = BaseEntity & FeatureExtension;
const TABLE_NAME = 'tblFeatures';

export const createFeature = async (feature: Feature): Promise<{ success: boolean; createdFeature?: Feature; error?: any }> => {
     if (!feature || Object.keys(feature).length === 0) {
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (feature.name.trim() === '') {
          return { success: false, error: 'clients.clientSettingsNoNameError' };
     }

     const { data: existingFeature } = await supabase
          .from(TABLE_NAME)
          .select('id')
          .ilike('name', feature.name.trim())
          .single();

     if (existingFeature) {
          return { success: false, error: 'clients.clientSettingsAlreadyExists' };
     }

     const { data, error } = await supabase
          .from(TABLE_NAME)
          .insert(feature)
          .select()
          .single();

     if (error) {
          return { success: false, error };
     }

     revalidatePath('/dashboard/subscriptions');
     return { success: true, createdFeature: data };
};

export const readFeature = async (id: string): Promise<{ success: boolean; feature?: Feature; error?: string }> => {
     const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { success: false, error: error.message };
     }

     return { success: true, feature: data };
};

export const updateFeature = async (id: string, feature: Partial<Feature>): Promise<{ success: boolean; updatedFeature?: Feature; error?: any }> => {
     if (!feature || Object.keys(feature).length === 0) {
          return { success: false, error: 'clients.clientSettingsNoEntityError' };
     }

     if (feature.name?.trim() === '') {
          return { success: false, error: 'clients.clientSettingsNoNameError' };
     }

     if (feature.name) {
          const { data: existingFeature } = await supabase
               .from(TABLE_NAME)
               .select('id')
               .ilike('name', feature.name.trim())
               .neq('id', id)
               .single();

          if (existingFeature) {
               return { success: false, error: 'clients.clientSettingsAlreadyExists' };
          }
     }

     const { data, error } = await supabase
          .from(TABLE_NAME)
          .update(feature)
          .eq('id', id)
          .select()
          .single();

     if (error) {
          return { success: false, error };
     }

     revalidatePath('/dashboard/subscriptions');
     return { success: true, updatedFeature: data };
};

export const deleteFeature = async (id: string): Promise<{ success: boolean; error?: string }> => {
     const { error } = await supabase
          .from(TABLE_NAME)
          .delete()
          .eq('id', id);

     if (error) {
          return { success: false, error: error.message };
     }

     revalidatePath('/dashboard/subscriptions');
     return { success: true };
};

export const readAllFeatures = async (): Promise<Feature[]> => {
     const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .order('updated_at', { ascending: false });

     if (error) {
          console.error(`Error fetching features:`, error);
          return [];
     }

     return data;
};
