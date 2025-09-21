'use server'

import { revalidatePath } from "next/cache";
import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { ClientSubscription, RenewalPeriod, SubscriptionPlan } from "src/types/subscription-plan";
import { Feature } from "src/types/base-entity";

export const createSubscriptionPlan = async (subscriptionPlan: SubscriptionPlan):
     Promise<{
          createSubscriptionPlanSuccess: boolean;
          createdSubscriptionPlan?: SubscriptionPlan;
          createSubscriptionPlanError?: any;
     }> => {

     const supabase = await useServerSideSupabaseAnonClient();

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
     const supabase = await useServerSideSupabaseAnonClient();

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
               payload: subscriptionPlan,
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
               payload: subscriptionPlan,
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
                    payload: subscriptionPlan,
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
                    payload: subscriptionPlan,
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
                    payload: subscriptionPlan,
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

     const supabase = await useServerSideSupabaseAnonClient();

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
 * @returns {Promise<{readAllSubscriptionPlansSuccess: boolean, subscriptionPlansData?: SubscriptionPlan[], readAllSubscriptionPlansError?: string}>}
 * A promise that resolves to an object with the following properties:
 * - `readAllSubscriptionPlansSuccess`: A boolean indicating whether the subscription plans were read successfully.
 * - `subscriptionPlansData`: An array of subscription plans, if successful.
 * - `readAllSubscriptionPlansError`: The error message, if any occurred during the reading process.
 */

export const readAllSubscriptionPlans = async (): Promise<{
     readAllSubscriptionPlansSuccess: boolean; subscriptionPlansData?: SubscriptionPlan[]; readAllSubscriptionPlansError?: string;
}> => {

     const supabase = await useServerSideSupabaseAnonClient();

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

     return { readAllSubscriptionPlansSuccess: true, subscriptionPlansData: subscriptionPlans };  // Return the subscription plans
};

export const deleteSubscriptionPlansByIds = async (ids: string[]): Promise<{ deleteSubscriptionPlansSuccess: boolean, deleteSubscriptionPlansError?: any }> => {

     const supabase = await useServerSideSupabaseAnonClient();

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

export const readSubscriptionPlanFromClientId = async (clientId: string): Promise<{
     readSubscriptionPlanFromClientIdSuccess: boolean;
     subscriptionPlan?: SubscriptionPlan;
     readSubscriptionPlanFromClientIdError?: string;
}> => {

     const supabase = await useServerSideSupabaseAnonClient();

     // Fetch the subscription_id from tblClient_Subscription based on client_id
     const { data: clientSubscription, error: clientSubscriptionError } = await supabase
          .from("tblClient_Subscription")
          .select("subscription_plan_id")
          .eq("client_id", clientId)
          .single();

     if (clientSubscriptionError || !clientSubscription) {
          return {
               readSubscriptionPlanFromClientIdSuccess: false,
               readSubscriptionPlanFromClientIdError: clientSubscriptionError?.message || "Client subscription not found."
          };
     }

     // Now fetch the subscription plan using the subscription_id from tblSubscriptionPlans
     const { data: subscriptionPlan, error: planError } = await supabase
          .from("tblSubscriptionPlans")
          .select(`*`)
          .eq("id", clientSubscription.subscription_plan_id)
          .single()

     if (planError) {
          return {
               readSubscriptionPlanFromClientIdSuccess: false,
               readSubscriptionPlanFromClientIdError: planError.message
          };
     }

     return {
          readSubscriptionPlanFromClientIdSuccess: true,
          subscriptionPlan
     };
};

export const readAllActiveSubscriptionPlans = async (): Promise<{
     readAllActiveSubscriptionPlansSuccess: boolean;
     activeSubscriptionPlansData?: SubscriptionPlan[];
     readAllActiveSubscriptionPlansError?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data, error } = await supabase
          .from("tblSubscriptionPlans")
          .select(`
      *,
      tblSubscriptionPlans_Features (
        feature_id,
        tblFeatures (*)
      )
    `)
          .eq("status", "active");

     if (error) {
          return {
               readAllActiveSubscriptionPlansSuccess: false,
               readAllActiveSubscriptionPlansError: error.message,
          };
     }

     // Map DB rows -> SubscriptionPlan with features: string[]
     const activeSubscriptionPlansData: SubscriptionPlan[] =
          (data ?? []).map((plan: any) => {
               const {
                    tblSubscriptionPlans_Features: relations = [],
                    created_at,
                    updated_at,
                    ...rest
               } = plan;

               // Prefer a stable string field from tblFeatures; fall back sensibly
               const features: string[] = relations
                    .map((rel: any) =>
                         rel?.tblFeatures?.key ??
                         rel?.tblFeatures?.name ??
                         String(rel?.feature_id)
                    )
                    .filter(Boolean);

               return {
                    ...rest,
                    created_at: created_at ? new Date(created_at) : new Date(0),
                    updated_at: updated_at ? new Date(updated_at) : new Date(0),
                    features,
               } as SubscriptionPlan;
          });

     return {
          readAllActiveSubscriptionPlansSuccess: true,
          activeSubscriptionPlansData,
     };
};


export const readSubscriptionPlanFeatures = async (
     id: string | null
): Promise<{
     readSubscriptionPlanFeaturesSuccess: boolean;
     subscriptionPlanFeatures?: SubscriptionPlan & { features: Feature[] };
     readSubscriptionPlanFeaturesError?: string;
}> => {
     if (!id) {
          return {
               readSubscriptionPlanFeaturesSuccess: false,
               readSubscriptionPlanFeaturesError: "Subscription plan ID is required",
          };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     const { data: subscriptionPlan, error } = await supabase
          .from("tblSubscriptionPlans")
          .select(`
      *,
      tblSubscriptionPlans_Features (
        tblFeatures (*)
      )
    `)
          .eq("id", id)
          .single();

     if (error || !subscriptionPlan) {
          await logServerAction({
               user_id: userId || '',
               action: 'Read Subscription Plan by ID',
               payload: { id },
               status: 'fail',
               error: error?.message || 'Not found',
               duration_ms: 0,
               type: 'db',
          });

          return {
               readSubscriptionPlanFeaturesSuccess: false,
               readSubscriptionPlanFeaturesError: error?.message || 'Subscription plan not found',
          };
     }

     // Normalize: rename tblSubscriptionPlans_Features → features
     const features: Feature[] = subscriptionPlan.tblSubscriptionPlans_Features?.map(
          (relation: { tblFeatures: Feature }) => relation.tblFeatures
     ) || [];

     const { tblSubscriptionPlans_Features, ...planData } = subscriptionPlan;

     await logServerAction({
          user_id: null,
          action: 'Read Subscription Plan by ID',
          payload: { id },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db',
     });

     return {
          readSubscriptionPlanFeaturesSuccess: true,
          subscriptionPlanFeatures: {
               ...planData,
               features,
          },
     };
};

export const subscribeClientAction = async (
     clientId: string,
     subscriptionPlanId: string,
     renewal_period: RenewalPeriod
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     const { data, error } = await supabase
          .from("tblClient_Subscription")
          .insert({
               client_id: clientId,
               subscription_plan_id: subscriptionPlanId,
               status: "trialing",
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString(),
               is_auto_renew: true,
               next_payment_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
               renewal_period: renewal_period
          });


     if (error) {
          await logServerAction({
               user_id: userId ?? '',
               action: "Subscribe Action Error",
               payload: { clientId, subscriptionPlanId },
               status: "fail",
               error: error.message,
               duration_ms: 0,
               type: "action",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: userId ?? '',
          action: "Subscribtion Action Successful",
          payload: { clientId, subscriptionPlanId },
          status: "success",
          error: "",
          duration_ms: 0,
          type: "action",
     });

     return { success: true };
};

export const unsubscribeClientAction = async (
     clientId: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     const { data, error } = await supabase
          .from("tblClient_Subscription")
          .update({
               status: "canceled",
               next_payment_date: new Date().toISOString(),
          })
          .eq("client_id", clientId)
          .eq("status", "active"); // only cancel active subs

     if (error) {
          await logServerAction({
               user_id: userId ?? '',
               action: "Unsubscribe Action",
               payload: { clientId },
               status: "fail",
               error: error.message,
               duration_ms: 0,
               type: "action",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: userId ?? '',
          action: "Unsubscribe Action",
          payload: { clientId },
          status: "success",
          error: "",
          duration_ms: 0,
          type: "action",
     });

     return { success: true };
};

export const readFeaturesFromSubscriptionPlanId = async (subscriptionPlanId: string | null): Promise<{ success: boolean, features?: Feature[], error?: string }> => {

     if (!subscriptionPlanId) {
          await logServerAction({
               user_id: null,
               action: 'Read Features from Subscription Plan ID',
               payload: { subscriptionPlanId },
               status: 'fail',
               error: "Subscription plan ID is required",
               duration_ms: 0,
               type: 'db'
          })
          return { success: false, error: "Subscription plan ID is required" };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;
     const { data: subscriptionPlan, error: planError } = await supabase
          .from("tblSubscriptionPlans")
          .select(`
      *,
          tblSubscriptionPlans_Features (
          feature_id,
          tblFeatures (*)
          )
    `)
          .eq("id", subscriptionPlanId)
          .single();

     if (planError) {
          await logServerAction({
               user_id: userId ? userId : '',
               action: 'Read Features from Subscription Plan ID',
               payload: { subscriptionPlanId },
               status: 'fail',
               error: planError.message,
               duration_ms: 0,
               type: 'db'
          })
          return { success: false, error: planError.message };
     }
     if (!subscriptionPlan) {
          await logServerAction({
               user_id: userId ? userId : '',
               action: 'Read Features from Subscription Plan ID',
               payload: { subscriptionPlanId },
               status: 'fail',
               error: "Subscription plan not found",
               duration_ms: 0,
               type: 'db'
          })
          return { success: false, error: "Subscription plan not found" };
     }
     // Extract features from the subscription plan and exclude tblSubscriptionPlans_Features
     const features = subscriptionPlan.tblSubscriptionPlans_Features.map((relation: any) => relation.tblFeatures);
     // Return the subscription plan without tblSubscriptionPlans_Features
     const { tblSubscriptionPlans_Features, ...restOfSubscriptionPlan } = subscriptionPlan;

     await logServerAction({
          user_id: null,
          action: 'Read Features from Subscription Plan ID',
          payload: { subscriptionPlanId },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     })

     return { success: true, features };
}

export const readClientSubscriptionPlanFromClientId = async (clientId: string): Promise<{ success: boolean, clientSubscriptionPlanData?: ClientSubscription & { subscription_plan: SubscriptionPlan } | null, error?: string }> => {

     if (!clientId) {
          await logServerAction({
               user_id: null,
               action: 'Read Client Subscription Plan',
               payload: { clientId },
               status: 'fail',
               error: "Client ID is required",
               duration_ms: 0,
               type: 'db'
          })
          return { success: false, error: "Client ID is required" };
     }
     const supabase = await useServerSideSupabaseAnonClient(); // Use the server-side Supabase client

     const { data: clientSubscriptionPlanData, error: clientSubscriptionDataError } = await supabase
          .from("tblClient_Subscription")
          .select(`
    *,
    subscription_plan:subscription_plan_id (*)
  `)
          .eq("client_id", clientId)
          .single();

     if (clientSubscriptionDataError) {
          await logServerAction({
               user_id: null,
               action: 'Read Client Subscription Plan',
               payload: { clientId },
               status: 'fail',
               error: clientSubscriptionDataError.message,
               duration_ms: 0,
               type: 'db'
          })
          return { success: false, error: clientSubscriptionDataError.message, clientSubscriptionPlanData: null };
     }

     if (!clientSubscriptionPlanData) {
          await logServerAction({
               user_id: null,
               action: 'Read Client Subscription Plan',
               payload: { clientId },
               status: 'fail',
               error: "Client subscription data not found",
               duration_ms: 0,
               type: 'db'
          })
          return { success: false, error: "Client subscription data not found", clientSubscriptionPlanData: null };
     }
     await logServerAction({
          user_id: null,
          action: 'Read Client Subscription Plan',
          payload: { clientId },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     })

     return { success: true, clientSubscriptionPlanData };

}

export const updateClientSubscriptionForClient = async (
     clientId: string,
     subscriptionPlanId: string,
     opts?: { nextPaymentDate?: string | null }
): Promise<{ success: boolean; error?: string }> => {

     if (!clientId || !subscriptionPlanId) {
          return { success: false, error: 'Client ID and Subscription Plan ID are required' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     // Check existing subscription row
     const { data: existing, error: readErr } = await supabase
          .from('tblClient_Subscription')
          .select('id')
          .eq('client_id', clientId)
          .single();

     if (readErr && readErr.code !== 'PGRST116') {
          await logServerAction({
               user_id: userId ?? '',
               action: 'Read Client Subscription (for update)',
               payload: { clientId },
               status: 'fail',
               error: readErr.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: readErr.message };
     }

     const nowIso = new Date().toISOString();
     const nextPaymentDate = opts?.nextPaymentDate ?? null;

     if (existing?.id) {
          const { error: updErr } = await supabase
               .from('tblClient_Subscription')
               .update({
                    subscription_plan_id: subscriptionPlanId,
                    next_payment_date: nextPaymentDate,
                    updated_at: nowIso,
               })
               .eq('id', existing.id);

          if (updErr) {
               await logServerAction({
                    user_id: userId ?? '',
                    action: 'Update Client Subscription',
                    payload: { clientId, subscriptionPlanId, nextPaymentDate },
                    status: 'fail',
                    error: updErr.message,
                    duration_ms: 0,
                    type: 'db'
               });
               return { success: false, error: updErr.message };
          }

          await logServerAction({
               user_id: userId ?? '',
               action: 'Update Client Subscription',
               payload: { clientId, subscriptionPlanId, nextPaymentDate },
               status: 'success',
               error: '',
               duration_ms: 0,
               type: 'db'
          });
          return { success: true };
     }

     // Insert if missing
     const { error: insErr } = await supabase
          .from('tblClient_Subscription')
          .insert({
               client_id: clientId,
               subscription_plan_id: subscriptionPlanId,
               status: 'active',
               created_at: nowIso,
               updated_at: nowIso,
               is_auto_renew: true,
               next_payment_date: nextPaymentDate,
               renewal_period: 'monthly'
          });

     if (insErr) {
          await logServerAction({
               user_id: userId ?? '',
               action: 'Insert Client Subscription',
               payload: { clientId, subscriptionPlanId, nextPaymentDate },
               status: 'fail',
               error: insErr.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: insErr.message };
     }

     await logServerAction({
          user_id: userId ?? '',
          action: 'Insert Client Subscription',
          payload: { clientId, subscriptionPlanId, nextPaymentDate },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     });
     return { success: true };
};
