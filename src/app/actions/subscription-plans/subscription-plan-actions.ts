'use server'

import { revalidatePath } from "next/cache";
import { supabase } from "src/libs/supabase/client";
import { SubscriptionPlan } from "src/types/subscription-plan";

export const createSubscriptionPlan = async (subscriptionPlan: SubscriptionPlan):
     Promise<{
          createSubscriptionPlanSuccess: boolean;
          createdSubscriptionPlan?: SubscriptionPlan;
          createSubscriptionPlanError?: any;
     }> => {

     const { data, error } = await supabase
          .from("tblSubscriptionPlans")
          .insert({ ...subscriptionPlan, features: undefined })
          .select()
          .single();

     if (error) {
          return { createSubscriptionPlanSuccess: false, createSubscriptionPlanError: error };
     }

     if (!data || !data.id) {
          return { createSubscriptionPlanSuccess: false, createSubscriptionPlanError: "Failed to create subscription plan." };
     }

     const featureEntries = subscriptionPlan.features && subscriptionPlan.features.length > 0 ?
          subscriptionPlan.features.map((featureId) => ({
               subscription_plan_id: data.id,
               feature_id: featureId,
          }))
          : [];

     if (featureEntries.length > 0) {
          const { error: featureInsertError } = await supabase
               .from("tblSubscriptionPlans_Features")
               .insert(featureEntries);

          if (featureInsertError) {
               console.error("Error inserting into tblSubscriptionPlans_Features:", featureInsertError);
               return {
                    createSubscriptionPlanSuccess: false,
                    createSubscriptionPlanError: featureInsertError
               };
          }
     }

     revalidatePath(`/dashboard/subscriptions/${data.id}`);
     return { createSubscriptionPlanSuccess: true, createdSubscriptionPlan: { ...data, features: subscriptionPlan.features } };
};

export const updateSubscriptionPlan = async (
     subscriptionPlan: SubscriptionPlan
): Promise<{
     updateSubscriptionPlanSuccess: boolean;
     updatedSubscriptionPlan?: SubscriptionPlan;
     updateSubscriptionPlanError?: any;
}> => {

     const { data, error } = await supabase
          .from("tblSubscriptionPlans")
          .update({ ...subscriptionPlan, features: undefined })
          .eq("id", subscriptionPlan.id)
          .select()
          .single();

     if (error) {
          return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: error };
     }

     if (!data || !data.id) {
          return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: "Failed to update subscription plan." };
     }

     const featureEntries = subscriptionPlan.features && subscriptionPlan.features.length > 0 ?
          subscriptionPlan.features.map((featureId) => ({
               subscription_plan_id: data.id,
               feature_id: featureId,
          }))
          : [];

     // If the features array is not empty, then remove any feature entries not present in the array
     if (featureEntries.length > 0) {

          // Delete all existing feature entries for the subscription plan
          const { error: featureDeleteError } = await supabase
               .from("tblSubscriptionPlans_Features")
               .delete()
               .match({ subscription_plan_id: data.id });

          if (featureDeleteError) {
               console.error("Error removing feature entries from tblSubscriptionPlans_Features:", featureDeleteError);
               return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: featureDeleteError };
          }

          // Insert the new feature entries
          const { error: featureInsertError } = await supabase
               .from("tblSubscriptionPlans_Features")
               .insert(featureEntries);

          if (featureInsertError) {
               console.error("Error inserting into tblSubscriptionPlans_Features:", featureInsertError);
               return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: featureInsertError };
          }

     } else {
          const { error: featureDeleteError } = await supabase
               .from("tblSubscriptionPlans_Features")
               .delete()
               .match({ subscription_plan_id: data.id });

          if (featureDeleteError) {
               console.error("Error removing feature entries from tblSubscriptionPlans_Features:", featureDeleteError);
               return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: featureDeleteError };
          }
     }

     revalidatePath(`/dashboard/subscriptions/${data.id}`);
     return { updateSubscriptionPlanSuccess: true, updatedSubscriptionPlan: { ...data, features: subscriptionPlan.features } };
};

export const readSubscriptionPlan = async (id: string): Promise<{
     readSubscriptionPlanSuccess: boolean; subscriptionPlan?: SubscriptionPlan; readSubscriptionPlanError?: string;
}> => {
     // Fetch the subscription plan along with its features using a join
     const { data: subscriptionPlan, error: planError } = await supabase
          .from("tblSubscriptionPlans")
          .select(`
      *,
      tblSubscriptionPlans_Features (
        feature_id,
        tblFeatures (*)
      )
    `)
          .eq("id", id)
          .single();

     if (planError) {
          return { readSubscriptionPlanSuccess: false, readSubscriptionPlanError: planError.message };
     }

     // Extract features from the subscription plan and exclude tblSubscriptionPlans_Features
     const features = subscriptionPlan.tblSubscriptionPlans_Features.map((relation: any) => relation.tblFeatures);

     // Return the subscription plan without tblSubscriptionPlans_Features
     const { tblSubscriptionPlans_Features, ...restOfSubscriptionPlan } = subscriptionPlan;

     return {
          readSubscriptionPlanSuccess: true,
          subscriptionPlan: { ...restOfSubscriptionPlan, features },
     };
};

export const deleteSubscriptionPlan = async (id: string): Promise<{ deleteSubscriptionPlanSuccess: boolean, deleteSubscriptionPlanError?: any }> => {

     // Delete fromm tblSubscriptionPlans_Features first
     const { error: featureDeleteError } = await supabase
          .from("tblSubscriptionPlans_Features")
          .delete()
          .match({ subscription_plan_id: id });

     if (featureDeleteError) {
          return { deleteSubscriptionPlanSuccess: false, deleteSubscriptionPlanError: featureDeleteError };
     }

     // Then delete from tblSubscriptionPlans
     const { error: planDeleteError } = await supabase
          .from("tblSubscriptionPlans")
          .delete()
          .match({ id });

     if (planDeleteError) {
          return { deleteSubscriptionPlanSuccess: false, deleteSubscriptionPlanError: planDeleteError };
     }
     return { deleteSubscriptionPlanSuccess: true };
};

export const readAllSubscriptionPlans = async (): Promise<{
     readAllSubscriptionPlansSuccess: boolean; subscriptionPlanData?: SubscriptionPlan[]; readAllSubscriptionPlansError?: string;
}> => {
     const { data: subscriptionPlans, error: planError } = await supabase
          .from("tblSubscriptionPlans")
          .select(`
      *,
      tblSubscriptionPlans_Features (
        feature_id,
        tblFeatures (*)
      )
    `);

     if (planError) {
          return { readAllSubscriptionPlansSuccess: false, readAllSubscriptionPlansError: planError.message };
     }

     return { readAllSubscriptionPlansSuccess: true, subscriptionPlanData: subscriptionPlans };  // Return the subscription plans
};

export const deleteSubscriptionPlansByIds = async (ids: string[]): Promise<{ deleteSubscriptionPlansSuccess: boolean, deleteSubscriptionPlansError?: any }> => {
     const { error } = await supabase.from("tblSubscriptionPlans").delete().in("id", ids);     // Delete the subscription plans
     if (error) {
          return { deleteSubscriptionPlansSuccess: false, deleteSubscriptionPlansError: error };    // Return an error if there is one
     }
     return { deleteSubscriptionPlansSuccess: true };    // Return success
};
