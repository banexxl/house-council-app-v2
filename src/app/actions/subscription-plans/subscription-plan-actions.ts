'use server'

import { revalidatePath } from "next/cache";
import { supabase } from "src/libs/supabase/client";
import { logServerAction } from "src/libs/supabase/server-logging";
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
               return {
                    createSubscriptionPlanSuccess: false,
                    createSubscriptionPlanError: featureInsertError
               };
          }
     }

     return { createSubscriptionPlanSuccess: true, createdSubscriptionPlan: { ...data, features: subscriptionPlan.features } };
};

/**
 * Updates an existing subscription plan in the database.
 * @param {SubscriptionPlan} subscriptionPlan The subscription plan to update.
 * @returns {Promise<{updateSubscriptionPlanSuccess: boolean, updatedSubscriptionPlan?: SubscriptionPlan, updateSubscriptionPlanError?: any}>}
 * A promise that resolves to an object with the following properties:
 * - `updateSubscriptionPlanSuccess`: A boolean indicating whether the subscription plan was updated successfully.
 * - `updatedSubscriptionPlan`: The updated subscription plan, if successful.
 * - `updateSubscriptionPlanError`: The error that occurred, if any.
 * If the subscription plan is updated successfully the path is revalidated
 */
export const updateSubscriptionPlan = async (
     subscriptionPlan: SubscriptionPlan
): Promise<{
     updateSubscriptionPlanSuccess: boolean;
     updatedSubscriptionPlan?: SubscriptionPlan;
     updateSubscriptionPlanError?: any;
}> => {

     const start = Date.now();

     const { data, error } = await supabase
          .from("tblSubscriptionPlans")
          .update({ ...subscriptionPlan, features: undefined })
          .eq("id", subscriptionPlan.id)
          .select()
          .single();

     if (data) {
          await logServerAction({
               user_id: null,
               action: 'Updating tblSubscriptionPlans successfull - ' + subscriptionPlan.id,
               payload: JSON.stringify(subscriptionPlan),
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'db'
          })
     }

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Updating tblSubscriptionPlans failed - ' + subscriptionPlan.id,
               payload: JSON.stringify(subscriptionPlan),
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db'
          })
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
               await logServerAction({
                    user_id: null,
                    action: 'Updating tblSubscriptionPlans_Features failed - ' + subscriptionPlan.id,
                    payload: JSON.stringify(subscriptionPlan),
                    status: 'fail',
                    error: featureDeleteError.message,
                    duration_ms: Date.now() - start,
                    type: 'db'
               })
               return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: featureDeleteError };
          }

          // Insert the new feature entries
          const { error: featureInsertError } = await supabase
               .from("tblSubscriptionPlans_Features")
               .insert(featureEntries);

          if (featureInsertError) {
               await logServerAction({
                    user_id: null,
                    action: 'Inserting into tblSubscriptionPlans_Features failed - ' + subscriptionPlan.id,
                    payload: JSON.stringify(subscriptionPlan),
                    status: 'fail',
                    error: featureInsertError.message,
                    duration_ms: Date.now() - start,
                    type: 'db'
               })
               return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: featureInsertError };
          }

     } else {
          const { error: featureDeleteError } = await supabase
               .from("tblSubscriptionPlans_Features")
               .delete()
               .match({ subscription_plan_id: data.id });

          if (featureDeleteError) {
               await logServerAction({
                    user_id: null,
                    action: 'Deleting from tblSubscriptionPlans_Features failed - ' + subscriptionPlan.id,
                    payload: JSON.stringify(subscriptionPlan),
                    status: 'fail',
                    error: featureDeleteError.message,
                    duration_ms: Date.now() - start,
                    type: 'db'
               })
               return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: featureDeleteError };
          }
     }

     revalidatePath(`/dashboard/subscriptions/${data.id}`);
     revalidatePath("/dashboard/subscriptions");
     return { updateSubscriptionPlanSuccess: true, updatedSubscriptionPlan: { ...data, features: subscriptionPlan.features } };
};

/**
 * Reads a subscription plan from the database.
 * @param {string} id The id of the subscription plan to read.
 * @returns {Promise<{readSubscriptionPlanSuccess: boolean, subscriptionPlan?: SubscriptionPlan, readSubscriptionPlanError?: string}>}
 * A promise that resolves to an object with the following properties:
 * - `readSubscriptionPlanSuccess`: A boolean indicating whether the subscription plan was read successfully.
 * - `subscriptionPlan`: The subscription plan that was read, if successful.
 * - `readSubscriptionPlanError`: The error that occurred, if any.
 */
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

/**
 * Reads all subscription plans from the database.
 * @returns {Promise<{readAllSubscriptionPlansSuccess: boolean, subscriptionPlanData?: SubscriptionPlan[], readAllSubscriptionPlansError?: string}>}
 * A promise that resolves to an object with the following properties:
 * - `readAllSubscriptionPlansSuccess`: A boolean indicating whether the subscription plans were read successfully.
 * - `subscriptionPlanData`: An array of subscription plans, if successful.
 * - `readAllSubscriptionPlansError`: The error message, if any occurred during the reading process.
 */

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
     // Delete related entries from the connection table first
     const { error: relationError } = await supabase.from("tblSubscriptionPlans_Features").delete().in("subscription_plan_id", ids);

     if (relationError) {
          return { deleteSubscriptionPlansSuccess: false, deleteSubscriptionPlansError: relationError };
     }

     // Now delete the subscription plans
     const { error } = await supabase.from("tblSubscriptionPlans").delete().in("id", ids);

     if (error) {
          return { deleteSubscriptionPlansSuccess: false, deleteSubscriptionPlansError: error };
     }

     revalidatePath("/dashboard/subscriptions");
     return { deleteSubscriptionPlansSuccess: true };
};
