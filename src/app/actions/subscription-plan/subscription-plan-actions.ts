'use server'

import { revalidatePath } from "next/cache";
import { logServerAction } from "src/libs/supabase/server-logging";
import { useServerSideSupabaseAnonClient } from "src/libs/supabase/sb-server";
import { PolarProduct, PolarProductPrice } from "src/types/polar-product-types";
import { TABLES } from "src/libs/supabase/tables";
import { PolarSubscription } from "src/types/polar-subscription-types";
import { polar } from "src/libs/polar/polar";

/**
 * Fetches the organization details from Polar.sh
 * @returns {Promise<{success: boolean; organization?: {id: string; slug: string; name: string}; error?: string}>}
 */
export const getPolarOrganization = async (): Promise<{
     success: boolean;
     organization?: { id: string; slug: string; name: string };
     error?: string;
}> => {
     try {
          const organizations = await polar.organizations.list({
               slug: 'nestlink',
               limit: 1
          });

          if (!organizations || organizations.result.items.length === 0) {
               return {
                    success: false,
                    error: 'No organization found in Polar account'
               };
          }

          const org = organizations.result.items[0];
          return {
               success: true,
               organization: {
                    id: org.id,
                    slug: org.slug,
                    name: org.name
               }
          };


     } catch (error: any) {
          await logServerAction({
               user_id: null,
               action: 'Get Polar Organization Failed',
               payload: { error: error.message },
               status: 'fail',
               error: error.message,
               duration_ms: 0,
               type: 'api'
          });
          return {
               success: false,
               error: error.message
          };
     }
};

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

     const start = Date.now();

     try {
          // Validate that at least one price exists
          if (!product.prices || product.prices.length === 0) {
               throw new Error('At least one price is required to create a product');
          }

          // Fetch organization from Polar.sh
          const orgResult = await getPolarOrganization();
          if (!orgResult.success || !orgResult.organization) {
               throw new Error(orgResult.error || 'No organization found in Polar account');
          }

          // Build the product creation payload
          // Note: organizationId is not included because we're using an organization token
          const createPayload: any = {
               name: product.name,
               description: product.description,
               prices: product.prices.map((price: PolarProductPrice) => {
                    const priceData: any = {
                         type: price.type as any,
                         amountType: price.amountType as any,
                         priceAmount: price.priceAmount,
                         priceCurrency: price.priceCurrency?.toLowerCase() || 'usd'
                    };
                    // Add recurringInterval only for recurring prices
                    if (price.type === 'recurring' && price.recurringInterval) {
                         priceData.recurringInterval = price.recurringInterval as any;
                         if (price.recurringIntervalCount) {
                              priceData.recurringIntervalCount = price.recurringIntervalCount;
                         }
                    }
                    return priceData;
               })
          };

          // Add recurring_interval if the product is recurring
          if (product.isRecurring && product.recurringInterval) {
               createPayload.recurringInterval = product.recurringInterval as any;
          }

          // Create product on Polar.sh
          let createdProduct;
          try {
               createdProduct = await polar.products.create(createPayload);
          } catch (createError: any) {
               throw new Error(`Failed to create product on Polar: ${createError.message}`);
          }

          await logServerAction({
               user_id: null,
               action: 'Create Polar Product Success',
               payload: { productId: createdProduct.id },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'api'
          });

          revalidatePath("/dashboard/subscriptions");
          return { createSubscriptionPlanSuccess: true, createdSubscriptionPlan: createdProduct as any };
     } catch (error: any) {
          await logServerAction({
               user_id: null,
               action: 'Create Polar Product Failed',
               payload: { product, error: error.message },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'api'
          });
          return { createSubscriptionPlanSuccess: false, createSubscriptionPlanError: error };
     }
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
     let updatedProduct
     try {
          // Update product on Polar.sh
          const pricesPayload = product.prices?.map((price: PolarProductPrice) => {
               // For existing prices, only send the ID
               if (price.id && price.id.trim() !== '') {
                    return { id: price.id };
               }
               // For new prices, send all required fields
               const priceData: any = {
                    type: price.type as any,
                    amountType: price.amountType as any,
                    priceAmount: price.priceAmount,
                    priceCurrency: price.priceCurrency?.toLowerCase() || 'usd'
               };
               // Add recurringInterval only for recurring prices
               if (price.type === 'recurring' && price.recurringInterval) {
                    priceData.recurringInterval = price.recurringInterval as any;
                    if (price.recurringIntervalCount) {
                         priceData.recurringIntervalCount = price.recurringIntervalCount;
                    }
               }
               return priceData;
          });

          const updatePayload: any = {
               name: product.name,
               description: product.description,
               prices: pricesPayload
          };

          // Add product-level recurring settings if applicable
          if (product.isRecurring && product.recurringInterval) {
               updatePayload.recurringInterval = product.recurringInterval as any;
          }

          updatedProduct = await polar.products.update({
               id: product.id,
               productUpdate: updatePayload
          });
          await logServerAction({
               user_id: null,
               action: 'Update Polar Product Success',
               payload: { productId: updatedProduct.id },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'api'
          });


          revalidatePath(`/dashboard/subscriptions/${updatedProduct.id}`);
          revalidatePath("/dashboard/subscriptions");
          return { updateSubscriptionPlanSuccess: true, updatedSubscriptionPlan: updatedProduct as any };
     } catch (error: any) {

          await logServerAction({
               user_id: null,
               action: 'Update Polar Product Failed',
               payload: { product, error: error.message },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'api'
          });
          return { updateSubscriptionPlanSuccess: false, updateSubscriptionPlanError: error };
     }
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
               supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('productId', id),
               supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('productId', id),
               supabase.from(TABLES.POLAR_PRODUCT_MEDIAS).select('*').eq('productId', id)
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
     // Fetch related data for all products
     if (!productError && products) {
          for (const product of products) {
               const [pricesResult, benefitsResult, mediasResult] = await Promise.all([
                    supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_MEDIAS).select('*').eq('productId', product.id)
               ]);
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

     const start = Date.now();

     try {
          // Delete products from Polar.sh
          for (const id of ids) {
               await polar.products.update({
                    id,
                    productUpdate: {
                         isArchived: true
                    }
               });
          }

          await logServerAction({
               user_id: null,
               action: 'Archive Polar Products Success',
               payload: { ids },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'api'
          });

          revalidatePath("/dashboard/subscriptions");
          return { deleteSubscriptionPlansSuccess: true };
     } catch (error: any) {
          await logServerAction({
               user_id: null,
               action: 'Archive Polar Products Failed',
               payload: { ids, error: error.message },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'api'
          });
          return { deleteSubscriptionPlansSuccess: false, deleteSubscriptionPlansError: error };
     }
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
          .eq("isArchived", false)
          .order('createdAt', { ascending: false });

     // Fetch related data for all products
     if (!error && products) {
          for (const product of products) {
               const [pricesResult, benefitsResult, mediasResult] = await Promise.all([
                    supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_MEDIAS).select('*').eq('productId', product.id)
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

     // Fetch the productId from POLAR_SUBSCRIPTIONS based on customerId
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

     // Now fetch the product using the productId
     const { data: product, error: productError } = await supabase
          .from(TABLES.POLAR_PRODUCTS)
          .select('*')
          .eq("id", clientSubscription.id)
          .single();

     if (!productError && product) {
          const [pricesResult, benefitsResult] = await Promise.all([
               supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('productId', product.id),
               supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('productId', product.id)
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
     priceId: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;
     const start = Date.now();

     try {
          // Create subscription on Polar.sh
          const subscription = await polar.subscriptions.create({
               customerId: customerId,
               productId: productId
          });

          await logServerAction({
               user_id: userId ?? '',
               action: "Subscribe Customer Action Successful",
               payload: { customerId, productId, subscriptionId: subscription.id },
               status: "success",
               error: "",
               duration_ms: Date.now() - start,
               type: "api",
          });

          revalidatePath(`/dashboard/clients/${customerId}`);
          return { success: true };
     } catch (error: any) {
          await logServerAction({
               user_id: userId ?? '',
               action: "Subscribe Customer Action Error",
               payload: { customerId, productId, error: error.message },
               status: "fail",
               error: error.message,
               duration_ms: Date.now() - start,
               type: "api",
          });
          return { success: false, error: error.message };
     }
};

/**
 * Unsubscribe a client (cancel their subscription).
 * @param {string} customerId The client ID.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export const unsubscribeCustomerAction = async (
     subscriptionId: string,
     customerId: string
): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;
     const start = Date.now();

     try {
          // Cancel subscription on Polar.sh
          await polar.subscriptions.revoke({
               id: subscriptionId
          });

          await logServerAction({
               user_id: userId ?? '',
               action: "Unsubscribe Customer Action",
               payload: { customerId, subscriptionId },
               status: "success",
               error: "",
               duration_ms: Date.now() - start,
               type: "api",
          });

          revalidatePath(`/dashboard/clients/${customerId}`);
          return { success: true };
     } catch (error: any) {
          await logServerAction({
               user_id: userId ?? '',
               action: "Unsubscribe Customer Action",
               payload: { customerId, subscriptionId, error: error.message },
               status: "fail",
               error: error.message,
               duration_ms: Date.now() - start,
               type: "api",
          });
          return { success: false, error: error.message };
     }
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

     if (!customerSubscriptionPlanDataError && customerSubscriptionPlanData && customerSubscriptionPlanData.productId) {
          // Fetch the product separately
          const { data: product } = await supabase
               .from(TABLES.POLAR_PRODUCTS)
               .select('*')
               .eq('id', customerSubscriptionPlanData.productId)
               .single();

          if (product) {
               const [pricesResult, benefitsResult] = await Promise.all([
                    supabase.from(TABLES.POLAR_PRODUCT_PRICES).select('*').eq('productId', product.id),
                    supabase.from(TABLES.POLAR_PRODUCT_BENEFITS).select('*').eq('productId', product.id)
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
 * @param {object} opts Optional parameters like status, apartmentCount, etc.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export const updateCustomerSubscriptionForCustomer = async (
     subscriptionId: string,
     customerId: string,
     productId: string,
     opts?: {
          apartmentCount?: number,
          productPriceId?: string
     }
): Promise<{ success: boolean; error?: string }> => {

     if (!subscriptionId || !customerId || !productId) {
          return { success: false, error: 'Subscription ID, Customer ID and Product ID are required' };
     }

     const supabase = await useServerSideSupabaseAnonClient();
     const userId = (await supabase.auth.getUser()).data.user?.id;
     const start = Date.now();

     try {
          // Update subscription on Polar.sh
          const updatePayload: any = {
               productId: productId
          };

          if (opts?.apartmentCount !== undefined) {
               updatePayload.seats = opts.apartmentCount;
          }
          if (opts?.productPriceId) {
               updatePayload.productPriceId = opts.productPriceId;
          }

          await polar.subscriptions.update({
               id: subscriptionId,
               subscriptionUpdate: updatePayload
          });

          await logServerAction({
               user_id: userId ?? '',
               action: 'Update Customer Subscription',
               payload: { subscriptionId, customerId, productId },
               status: 'success',
               error: '',
               duration_ms: Date.now() - start,
               type: 'api'
          });
          revalidatePath(`/dashboard/clients/${customerId}`);
          return { success: true };
     } catch (error: any) {
          await logServerAction({
               user_id: userId ?? '',
               action: 'Update Customer Subscription',
               payload: { subscriptionId, customerId, productId, error: error.message },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - start,
               type: 'api'
          });
          return { success: false, error: error.message };
     }
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
