'use server'

import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { logServerAction } from "src/libs/supabase/server-logging";
import { Feature } from "src/types/base-entity";
import { ClientSubscription, RenewalPeriod, SubscriptionPlan } from "src/types/subscription-plan";


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


export const readSubscriptionPlansByStatus = async (
     status: string
): Promise<{
     readAllSubscriptionPlansSuccess: boolean;
     subscriptionPlanData?: (SubscriptionPlan & { features: any[] })[];
     readAllSubscriptionPlansError?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     const { data: subscriptionPlans, error: planError } = await supabase
          .from("tblSubscriptionPlans")
          .select(`
         *,
         tblSubscriptionPlanStatuses!status_id (
           name
         ),
         tblSubscriptionPlans_Features (
           feature_id,
           tblFeatures (*)
         )
       `)
          .order("monthly_total_price", { ascending: true });

     if (planError) {
          await logServerAction({
               user_id: userId ?? "",
               action: "Read All Subscription Plans",
               payload: { status },
               status: "fail",
               error: planError.message,
               duration_ms: 0,
               type: "db",
          });
          return {
               readAllSubscriptionPlansSuccess: false,
               readAllSubscriptionPlansError: planError.message,
          };
     }

     // Filter by status name
     const filteredPlans = (subscriptionPlans || []).filter(
          (plan: any) => plan.tblSubscriptionPlanStatuses?.name === status
     );

     // Flatten features into a simple array
     const plansWithFeatures = filteredPlans.map((plan: any) => ({
          ...plan,
          features: plan.tblSubscriptionPlans_Features.map(
               (pf: any) => pf.tblFeatures
          ),
     }));

     await logServerAction({
          user_id: null,
          action: "Read All Subscription Plans",
          payload: { status },
          status: "success",
          error: "",
          duration_ms: 0,
          type: "db",
     });

     return {
          readAllSubscriptionPlansSuccess: true,
          subscriptionPlanData: plansWithFeatures,
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
