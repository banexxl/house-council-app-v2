'use server'

import { revalidatePath } from "next/cache";
import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { PolarRecurringInterval } from "src/types/subscription-plan";
import { PolarProduct, PolarProductPrice } from "src/types/polar-product-types";
import { TABLES } from "src/libs/supabase/tables";
import { PolarSubscription } from "src/types/polar-subscription-types";

/**
 * Creates a new Polar product in the database.
 * @param {PolarProduct} product The Polar product to create.
 * @returns {Promise<{success: boolean; product?: PolarProduct; error?: any}>}
 */
export const createSubscriptionPlan = async (product: PolarProduct):
     Promise<{
          createSubscriptionPlanSuccess: boolean;
          createdSubscriptionPlan?: PolarProduct;
          createSubscriptionPlanError?: any;
     }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const start = Date.now();

     // Separate nested data
     const { prices, benefits, medias, attachedCustomFields, ...productData } = product;

     const { data, error } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .insert(productData)
          .select()
          .single();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Create Polar Product Failed',
               payload: { product, error },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db'
          });
          return { createSubscriptionPlanSuccess: false, createSubscriptionPlanError: error };
     }

     if (!data || !data.id) {
          return { createSubscriptionPlanSuccess: false, createSubscriptionPlanError: "Failed to create product." };
     }

     // Insert prices if provided
     if (prices && prices.length > 0) {
          const priceEntries = prices.map(price => ({
               ...price,
               product_id: data.id
          }));

          const { error: priceError } = await supabase
               .from(TABLES.POLAR_PRODUCT_PRICES)
               .insert(priceEntries);

          if (priceError) {
               await logServerAction({
                    user_id: null,
                    action: 'Insert Polar Product Prices Failed',
                    payload: { productId: data.id, priceError },
                    status: 'fail',
                    error: priceError.message,
                    duration_ms: Date.now() - start,
                    type: 'db'
               });
          }
     }

     await logServerAction({
          user_id: null,
          action: 'Create Polar Product Success',
          payload: { productId: data.id },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db'
     });

     return { createSubscriptionPlanSuccess: true, createdSubscriptionPlan: data };
};

/**
 * Updates an existing Polar product in the database.
 * @param {PolarProduct} product The Polar product to update.
 * @returns {Promise<{success: boolean, product?: PolarProduct, error?: any}>}
 */
export const updateSubscriptionPlan = async (
     product: PolarProduct
): Promise<{
     updateSubscriptionPlanSuccess: boolean;
     updatedSubscriptionPlan?: PolarProduct;
     updateSubscriptionPlanError?: any;
}> => {

     const start = Date.now();
     const supabase = await useServerSideSupabaseAnonClient();

     // Separate nested data
     const { prices, benefits, medias, attachedCustomFields, ...productData } = product;

     const { data, error } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .update(productData)
          .eq("id", product.id)
          .select()
          .single();

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Update Polar Product Failed',
               payload: { product, error },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db'
          });
          return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: error };
     }

     if (!data || !data.id) {
          return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: "Failed to update product." };
     }

     // Update prices if provided
     if (prices && prices.length > 0) {
          // Delete existing prices
          await supabase
               .from(TABLES.POLAR_PRODUCT_PRICES)
               .delete()
               .eq('product_id', data.id);

          // Insert new prices
          const priceEntries = prices.map(price => ({
               ...price,
               product_id: data.id
          }));

          const { error: priceError } = await supabase
               .from(TABLES.POLAR_PRODUCT_PRICES)
               .insert(priceEntries);

          if (priceError) {
               await logServerAction({
                    user_id: null,
                    action: 'Update Polar Product Prices Failed',
                    payload: { productId: data.id, priceError },
                    status: 'fail',
                    error: priceError.message,
                    duration_ms: Date.now() - start,
                    type: 'db'
               });
          }
     }

     await logServerAction({
          user_id: null,
          action: 'Update Polar Product Success',
          payload: { productId: data.id },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db'
     });

     revalidatePath(`/dashboard/subscriptions/${data.id}`);
     revalidatePath("/dashboard/subscriptions");
     return { updateSubscriptionPlanSuccess: true, updatedSubscriptionPlan: data };
};

/**
 * Reads a Polar product from the database by ID.
 * @param {string} id The id of the product to read.
 * @returns {Promise<{readSubscriptionPlanSuccess: boolean, subscriptionPlan?: PolarProduct, readSubscriptionPlanError?: string}>}
 */
export const readSubscriptionPlan = async (id: string): Promise<{
     readSubscriptionPlanSuccess: boolean;
     subscriptionPlan?: PolarProduct;
     readSubscriptionPlanError?: string;
}> => {

     const supabase = await useServerSideSupabaseAnonClient();

     // Fetch the product with prices and benefits
     const { data: product, error: productError } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .select('*')
          .eq("id", id)
          .single();

     if (!productError && product) {
          // Fetch related data separately
          const [pricesResult, benefitsResult, mediasResult] = await Promise.all([
               supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('product_id', id),
               supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('product_id', id),
               supabase.from(TABLES.POLAR_PRODUCT_MEDIAS).select('*').eq('product_id', id)
          ]);

          product.prices = pricesResult.data || [];
          product.benefits = benefitsResult.data || [];
          product.medias = mediasResult.data || [];
     }

     if (productError) {
          await logServerAction({
               user_id: null,
               action: 'Read Polar Product by ID Failed',
               payload: { id, productError },
               status: 'fail',
               error: productError.message,
               duration_ms: 0,
               type: 'db'
          });
          return { readSubscriptionPlanSuccess: false, readSubscriptionPlanError: productError.message };
     }

     return {
          readSubscriptionPlanSuccess: true,
          subscriptionPlan: product,
     };
};

/**
 * Reads all Polar products from the database.
 * @returns {Promise<{readAllSubscriptionPlansSuccess: boolean, subscriptionPlansData?: PolarProduct[], readAllSubscriptionPlansError?: string}>}
 */
export const readAllSubscriptionPlans = async (): Promise<{
     readAllSubscriptionPlansSuccess: boolean;
     subscriptionPlansData?: PolarProduct[];
     readAllSubscriptionPlansError?: string;
}> => {

     const supabase = await useServerSideSupabaseAnonClient();


     const { data: products, error: productError } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .select('*')
          .order('createdAt', { ascending: false });
     console.log('data', products);
     console.log('error', productError);

     // Fetch related data for all products
     if (!productError && products) {
          for (const product of products) {
               const [pricesResult, benefitsResult, mediasResult] = await Promise.all([
                    supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_MEDIAS).select('*').eq('productId', product.id)
               ]);
               console.log('pricesResult', pricesResult);
               console.log('benefitsResult', benefitsResult);
               console.log('mediasResult', mediasResult);

               product.prices = pricesResult.data || [];
               product.benefits = benefitsResult.data || [];
               product.medias = mediasResult.data || [];
          }
     }

     if (productError) {
          await logServerAction({
               user_id: null,
               action: 'Read All Polar Products Failed',
               payload: { productError },
               status: 'fail',
               error: productError.message,
               duration_ms: 0,
               type: 'db'
          });
          return { readAllSubscriptionPlansSuccess: false, readAllSubscriptionPlansError: productError.message };
     }

     return { readAllSubscriptionPlansSuccess: true, subscriptionPlansData: products };
};

/**
 * Deletes Polar products by their IDs.
 * @param {string[]} ids Array of product IDs to delete.
 * @returns {Promise<{deleteSubscriptionPlansSuccess: boolean, deleteSubscriptionPlansError?: any}>}
 */
export const deleteSubscriptionPlansByIds = async (ids: string[]): Promise<{
     deleteSubscriptionPlansSuccess: boolean,
     deleteSubscriptionPlansError?: any
}> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const start = Date.now();

     // Delete related prices first
     const { error: priceError } = await supabase
          .from(TABLES.POLAR_PRODUCT_PRICES)
          .delete()
          .in("product_id", ids);

     if (priceError) {
          await logServerAction({
               user_id: null,
               action: 'Delete Polar Product Prices Failed',
               payload: { ids, priceError },
               status: 'fail',
               error: priceError.message,
               duration_ms: Date.now() - start,
               type: 'db'
          });
          return { deleteSubscriptionPlansSuccess: false, deleteSubscriptionPlansError: priceError };
     }

     // Delete related benefits
     await supabase
          .from(TABLES.POLAR_PRODUCT_BENEFITS)
          .delete()
          .in("product_id", ids);

     // Delete related medias
     await supabase
          .from(TABLES.POLAR_PRODUCT_MEDIAS)
          .delete()
          .in("product_id", ids);

     // Now delete the products
     const { error } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .delete()
          .in("id", ids);

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Delete Polar Products Failed',
               payload: { ids, error },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'db'
          });
          return { deleteSubscriptionPlansSuccess: false, deleteSubscriptionPlansError: error };
     }

     await logServerAction({
          user_id: null,
          action: 'Delete Polar Products Success',
          payload: { ids },
          status: 'success',
          error: '',
          duration_ms: Date.now() - start,
          type: 'db'
     });

     revalidatePath("/dashboard/subscriptions");
     return { deleteSubscriptionPlansSuccess: true };
};

/**
 * Reads all active (non-archived) Polar products.
 * @returns {Promise<{readAllActiveSubscriptionPlansSuccess: boolean, activeSubscriptionPlansData?: PolarProduct[], readAllActiveSubscriptionPlansError?: string}>}
 */
export const readAllActiveSubscriptionPlans = async (): Promise<{
     readAllActiveSubscriptionPlansSuccess: boolean;
     activeSubscriptionPlansData?: PolarProduct[];
     readAllActiveSubscriptionPlansError?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     const { data: products, error } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .select('*')
          .eq("is_archived", false)
          .order('createdAt', { ascending: false });

     // Fetch related data for all products
     if (!error && products) {
          for (const product of products) {
               const [pricesResult, benefitsResult, mediasResult] = await Promise.all([
                    supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('product_id', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('product_id', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_MEDIAS).select('*').eq('product_id', product.id)
               ]);
               product.prices = pricesResult.data || [];
               product.benefits = benefitsResult.data || [];
               product.medias = mediasResult.data || [];
          }
     }

     if (error) {
          await logServerAction({
               user_id: null,
               action: 'Read Active Polar Products Failed',
               payload: { error },
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'db'
          });
          return {
               readAllActiveSubscriptionPlansSuccess: false,
               readAllActiveSubscriptionPlansError: error.message,
          };
     }

     return {
          readAllActiveSubscriptionPlansSuccess: true,
          activeSubscriptionPlansData: products,
     };
};

/**
 * Reads a Polar product from a client ID via POLAR_SUBSCRIPTIONS table.
 * @param {string} customerId The client ID.
 * @returns {Promise<{readSubscriptionPlanFromCustomerIdSuccess: boolean, subscriptionPlan?: PolarProduct, readSubscriptionPlanFromCustomerIdError?: string}>}
 */
export const readSubscriptionPlanFromCustomerId = async (customerId: string): Promise<{
     readSubscriptionPlanFromCustomerIdSuccess: boolean;
     subscriptionPlan?: PolarProduct;
     readSubscriptionPlanFromCustomerIdError?: string;
}> => {

     const supabase = await useServerSideSupabaseAnonClient();

     // Fetch the product_id from POLAR_SUBSCRIPTIONS based on customerId
     const { data: clientSubscription, error: clientSubscriptionError } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .select("id")
          .eq("customerId", customerId)
          .single();

     if (clientSubscriptionError || !clientSubscription || !clientSubscription.id) {
          return {
               readSubscriptionPlanFromCustomerIdSuccess: false,
               readSubscriptionPlanFromCustomerIdError: clientSubscriptionError?.message || "Customer subscription not found."
          };
     }

     // Now fetch the product using the product_id
     const { data: product, error: productError } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .select('*')
          .eq("id", clientSubscription.id)
          .single();

     if (!productError && product) {
          const [pricesResult, benefitsResult] = await Promise.all([
               supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('product_id', product.id),
               supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('product_id', product.id)
          ]);
          product.prices = pricesResult.data || [];
          product.benefits = benefitsResult.data || [];
     }

     if (productError) {
          return {
               readSubscriptionPlanFromCustomerIdSuccess: false,
               readSubscriptionPlanFromCustomerIdError: productError.message
          };
     }

     return {
          readSubscriptionPlanFromCustomerIdSuccess: true,
          subscriptionPlan: product
     };
};

/**
 * Subscribe a client to a Polar product.
 * @param {string} customerId The client ID.
 * @param {string} productId The Polar product ID.
 * @param {PolarRecurringInterval} renewal_period The renewal period.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export const subscribeCustomerAction = async (
     customerId: string,
     productId: string,
     renewal_period: PolarRecurringInterval
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     const { data, error } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .insert({
               customerId: customerId,
               product_id: productId,
               status: "trialing",
               createdAt: new Date().toISOString(),
               updated_at: new Date().toISOString(),
               recurring_interval: renewal_period,
               recurring_interval_count: 1,
               apartment_count: 0,
               amount: 0,
               currency: 'USD',
               current_period_start: new Date().toISOString(),
               current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
               cancel_at_period_end: false
          });

     if (error) {
          await logServerAction({
               user_id: userId ?? '',
               action: "Subscribe Customer Action Error",
               payload: { customerId, productId, error },
               status: "fail",
               error: error.message,
               duration_ms: 0,
               type: "action",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: userId ?? '',
          action: "Subscribe Customer Action Successful",
          payload: { customerId, productId },
          status: "success",
          error: "",
          duration_ms: 0,
          type: "action",
     });

     return { success: true };
};

/**
 * Unsubscribe a client (cancel their subscription).
 * @param {string} customerId The client ID.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export const unsubscribeCustomerAction = async (
     customerId: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     const { data, error } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .update({
               status: "canceled",
               cancel_at_period_end: true,
               canceled_at: new Date().toISOString(),
          })
          .eq("customerId", customerId)
          .eq("status", "active");

     if (error) {
          await logServerAction({
               user_id: userId ?? '',
               action: "Unsubscribe Customer Action",
               payload: { customerId, error },
               status: "fail",
               error: error.message,
               duration_ms: 0,
               type: "action",
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: userId ?? '',
          action: "Unsubscribe Customer Action",
          payload: { customerId },
          status: "success",
          error: "",
          duration_ms: 0,
          type: "action",
     });

     return { success: true };
};

/**
 * Read a client's subscription details with the associated Polar product.
 * @param {string} customerId The client ID.
 * @returns {Promise<{success: boolean, clientSubscriptionPlanData?: CustomerSubscription & { product: PolarProduct } | null, error?: string}>}
 */
export const readCustomerSubscriptionPlanFromCustomerId = async (customerId: string): Promise<{
     success: boolean,
     customerSubscriptionPlanData?: PolarSubscription & { product: PolarProduct } | null,
     error?: string
}> => {

     if (!customerId) {
          await logServerAction({
               user_id: null,
               action: 'Read Customer Subscription Plan',
               payload: { customerId },
               status: 'fail',
               error: "Customer ID is required",
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: "Customer ID is required" };
     }

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: customerSubscriptionPlanData, error: customerSubscriptionPlanDataError } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .select('*')
          .eq("customerId", customerId)
          .single();

     if (!customerSubscriptionPlanDataError && customerSubscriptionPlanData && customerSubscriptionPlanData.product_id) {
          // Fetch the product separately
          const { data: product } = await supabase
               .from(TABLES.POLAR_PRODUCTS)
               .select('*')
               .eq('id', customerSubscriptionPlanData.product_id)
               .single();

          if (product) {
               const [pricesResult, benefitsResult] = await Promise.all([
                    supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('product_id', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('product_id', product.id)
               ]);
               product.prices = pricesResult.data || [];
               product.benefits = benefitsResult.data || [];
               (customerSubscriptionPlanData as any).product = product;
          }
     }

     if (customerSubscriptionPlanDataError) {
          await logServerAction({
               user_id: null,
               action: 'Read Customer Subscription Plan',
               payload: { customerId },
               status: 'fail',
               error: customerSubscriptionPlanDataError.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: customerSubscriptionPlanDataError.message, customerSubscriptionPlanData: null };
     }

     if (!customerSubscriptionPlanData) {
          await logServerAction({
               user_id: null,
               action: 'Read Customer Subscription Plan',
               payload: { customerId, customerSubscriptionPlanDataError },
               status: 'fail',
               error: "Customer subscription data not found",
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: "Customer subscription data not found", customerSubscriptionPlanData: null };
     }

     await logServerAction({
          user_id: null,
          action: 'Read Customer Subscription Plan',
          payload: { customerId },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     });

     return { success: true, customerSubscriptionPlanData };
};

/**
 * Update or create a client's subscription.
 * @param {string} customerId The client ID.
 * @param {string} productId The Polar product ID.
 * @param {object} opts Optional parameters like status, apartment_count, etc.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export const updateCustomerSubscriptionForCustomer = async (
     customerId: string,
     productId: string,
     opts?: {
          status?: 'trialing' | 'active' | 'past_due' | 'canceled',
          apartment_count?: number,
          amount?: number,
          current_period_end?: string
     }
): Promise<{ success: boolean; error?: string }> => {

     if (!customerId || !productId) {
          return { success: false, error: 'Customer ID and Product ID are required' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;

     // Check if subscription exists
     const { data: existing, error: readErr } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .select('id')
          .eq('customerId', customerId)
          .single();

     if (readErr && readErr.code !== 'PGRST116') {
          await logServerAction({
               user_id: userId ?? '',
               action: 'Read Customer Subscription (for update)',
               payload: { customerId, readErr },
               status: 'fail',
               error: readErr.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: readErr.message };
     }

     const nowIso = new Date().toISOString();
     const subscriptionStatus = opts?.status ?? 'active';

     if (existing?.id) {
          const updatePayload: any = {
               product_id: productId,
               updated_at: nowIso,
               status: subscriptionStatus,
          };

          if (opts?.apartment_count !== undefined) updatePayload.apartment_count = opts.apartment_count;
          if (opts?.amount !== undefined) updatePayload.amount = opts.amount;
          if (opts?.current_period_end) updatePayload.current_period_end = opts.current_period_end;

          const { error: updErr } = await supabase
               .from(TABLES.POLAR_SUBSCRIPTIONS)
               .update(updatePayload)
               .eq('id', existing.id);

          if (updErr) {
               await logServerAction({
                    user_id: userId ?? '',
                    action: 'Update Customer Subscription',
                    payload: { customerId, productId, error: updErr.message },
                    status: 'fail',
                    error: updErr.message,
                    duration_ms: 0,
                    type: 'db'
               });
               return { success: false, error: updErr.message };
          }

          await logServerAction({
               user_id: userId ?? '',
               action: 'Update Customer Subscription',
               payload: { customerId, productId },
               status: 'success',
               error: '',
               duration_ms: 0,
               type: 'db'
          });
          revalidatePath(`/dashboard/clients/${customerId}`);
          return { success: true };
     }

     // Insert if missing
     const { error: insErr } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .insert({
               customerId: customerId,
               product_id: productId,
               status: subscriptionStatus,
               createdAt: nowIso,
               updated_at: nowIso,
               apartment_count: opts?.apartment_count ?? 0,
               amount: opts?.amount ?? 0,
               currency: 'USD',
               recurring_interval: 'month',
               recurring_interval_count: 1,
               current_period_start: nowIso,
               current_period_end: opts?.current_period_end ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
               cancel_at_period_end: false
          });

     if (insErr) {
          await logServerAction({
               user_id: userId ?? '',
               action: 'Insert Customer Subscription',
               payload: { customerId, productId, error: insErr.message },
               status: 'fail',
               error: insErr.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: insErr.message };
     }

     await logServerAction({
          user_id: userId ?? '',
          action: 'Insert Customer Subscription',
          payload: { customerId, productId },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     });
     revalidatePath(`/dashboard/clients/${customerId}`);
     return { success: true };
};

/**
 * Check if a client's subscription is active.
 * @param {string} customerId The client ID.
 * @returns {Promise<{success: boolean; isActive?: boolean; error?: string}>}
 */
export const checkCustomerSubscriptionStatus = async (
     customerId: string
): Promise<{ success: boolean; isActive?: boolean; error?: string }> => {

     const supabase = await useServerSideSupabaseAnonClient();
     const { data, error } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .select('status')
          .eq('customerId', customerId)
          .single();

     if (error) {
          await logServerAction({
               user_id: customerId ?? '',
               action: 'Check Customer Subscription Status',
               payload: { customerId, error },
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: error.message };
     }

     return { success: true, isActive: data?.status === 'active' || data?.status === 'trialing' };
};

/**
 * Delete a client's subscription.
 * @param {string} customerId The client ID.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export const deleteCustomerSubscription = async (
     customerId: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { error } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .delete()
          .eq('customerId', customerId);

     if (error) {
          await logServerAction({
               user_id: customerId ?? '',
               action: 'Delete Customer Subscription',
               payload: { customerId, error },
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'db'
          });
          return { success: false, error: error.message };
     }

     await logServerAction({
          user_id: customerId ?? '',
          action: 'Delete Customer Subscription',
          payload: { customerId },
          status: 'success',
          error: '',
          duration_ms: 0,
          type: 'db'
     });
     revalidatePath(`/dashboard/clients/${customerId}`);
     return { success: true };
};

export const getProductFromCustomerSubscription = async (customerId: string): Promise<PolarProduct | null> => {

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: subscription, error: subscriptionError } = await supabase
          .from(TABLES.POLAR_SUBSCRIPTIONS)
          .select('productId')
          .eq('customerId', customerId)
          .single();
     if (subscriptionError || !subscription || !subscription.productId) {
          return null;
     }

     const { data: product, error: productError } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .select('*')
          .eq('id', subscription.productId)
          .single();

     if (productError || !product) {
          return null;
     }

     return product;
}
