'use server'

import { revalidatePath } from "next/cache";
import { supabase } from "src/libs/supabase/client";
import { SubscriptionPlan } from "src/types/subscription-plan";
export const createSubscriptionPlan = async <T extends Omit<SubscriptionPlan, "id" | "features">>(subscriptionPlan: T): Promise<{ createSubscriptionPlanSuccess: boolean; createdSubscriptionPlan?: T; createSubscriptionPlanError?: any; }> => {

     const { data, error } = await supabase
          .from('tblSubscriptionPlans')
          .insert(subscriptionPlan)
          .select()
          .single();
     console.log('data', data);
     console.log('error', error);

     if (error) {
          return { createSubscriptionPlanSuccess: false, createSubscriptionPlanError: error };
     }

     return { createSubscriptionPlanSuccess: true, createdSubscriptionPlan: data };
};

export const readSubscriptionPlan = async (id: string): Promise<{ success: boolean, subscriptionPlan?: SubscriptionPlan, error?: string }> => {
     const { data, error } = await supabase
          .from('tblSubscriptionPlans')
          .select('*')
          .eq('id', id)
          .single();

     if (error) {
          return { success: false, error: error.message };
     }

     return { success: true, subscriptionPlan: data };
};

export const updateSubscriptionPlan = async (id: string, subscriptionPlan: Partial<SubscriptionPlan>): Promise<{ updateSubscriptionPlanSuccess: boolean, updatedSubscriptionPlan?: SubscriptionPlan, updateSubscriptionPlanError?: any }> => {
     const { data, error } = await supabase
          .from('tblSubscriptionPlans')
          .update(subscriptionPlan)
          .eq('id', id)
          .select()
          .single();

     if (error) {
          return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: error };
     }

     revalidatePath('/dashboard/subscriptions/subscription-plans');
     return { updateSubscriptionPlanSuccess: true, updatedSubscriptionPlan: data };
};

export const deleteSubscriptionPlan = async (id: string): Promise<{ deleteSubscriptionPlanSuccess: boolean, deleteSubscriptionPlanError?: any }> => {
     const { error } = await supabase
          .from('tblSubscriptionPlans')
          .delete()
          .eq('id', id);

     if (error) {
          return { deleteSubscriptionPlanSuccess: false, deleteSubscriptionPlanError: error };
     }

     revalidatePath('/dashboard/subscriptions/subscription-plans');
     return { deleteSubscriptionPlanSuccess: true };
};
