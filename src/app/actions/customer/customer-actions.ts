'use server';

import { revalidatePath } from 'next/cache';
import { logServerAction } from 'src/libs/supabase/server-logging';
import { Tenant } from 'src/types/tenant';
import { isUUIDv4 } from 'src/utils/uuid';
import { validate as isUUID } from 'uuid';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';
import { getViewer } from 'src/libs/supabase/server-auth';
import { PolarCustomer, PolarCustomerAddress } from 'src/types/polar-customer-types';
import { polar } from 'src/libs/polar/polar';
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';

export type CustomerBuildingOption = {
     id: string;
     label: string;
     street_address?: string;
     city?: string;
};

// --- Supabase Auth Actions for PolarCustomer Management ---
export const sendPasswordRecoveryEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: process.env.NEXT_PUBLIC_SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL,
     });

     if (error) {
          log(`sendPasswordRecoveryEmail error: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }
     return { success: true };
};

export const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { data, error } = await supabase.auth.signInWithOtp({
          email,
          // options: {
          //      emailRedirectTo: process.env.NEXT_PUBLIC_SUPABASE_INVITE_REDIRECT_URL,
          // },
     });

     if (error) {
          log(`sendMagicLink error: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }
     return { success: true };
};

export const removeAllMfaFactors = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     // List all factors for the user
     const { data: factors, error: listError } = await supabase.auth.admin.mfa.listFactors({ userId });
     if (listError) {
          log(`removeAllMfaFactors list error for user ${userId}: ${listError.message}`, 'error');
          return { success: false, error: listError.message };
     }
     if (!factors || !Array.isArray(factors.factors)) return { success: true };
     let lastError = null;
     for (const factor of factors.factors) {
          const { error } = await supabase.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
          if (error) {
               log(`removeAllMfaFactors delete error for factor ${factor.id} user ${userId}: ${error.message}`, 'error');
               lastError = error;
          }
     }
     if (lastError) return { success: false, error: lastError.message };
     return { success: true };
};

export const banUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     // Mark user as banned in user_metadata (Supabase does not support a direct ban flag)
     const { error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
               banned: true,
               ban_reason: 'Violation of terms of service',
          },
          ban_duration: '24h',
          email_confirm: true, // Optional: prevent login until email is confirmed
     });

     if (error) {
          log(`banUser error for user ${userId}: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }
     return { success: true };
};

export const unbanUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
     const supabase = await useServerSideSupabaseServiceRoleClient();
     const { error } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
               banned: false,
               ban_reason: null,
          },
          ban_duration: '0s',
          email_confirm: false,
     });

     if (error) {
          log(`unbanUser error for user ${userId}: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }

     return { success: true };
};

export const resetPasswordWithOldPassword = async (email: string, oldPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {

     const startTime = Date.now();

     let userId = null;

     const supabase = await useServerSideSupabaseAnonClient();

     const { data: user, error: userError } = await supabase
          .from(TABLES.POLAR_CUSTOMERS)
          .select('*')
          .eq('email', email)
          .single();

     userId = user?.id || null;

     if (userError || !user) {
          log(`resetPasswordWithOldPassword user lookup error for ${email}: ${userError?.message || 'User not found'}`, 'error');
          await logServerAction({
               user_id: null,
               action: 'Reset password - user not found',
               payload: { email },
               status: 'fail',
               error: userError?.message || 'User not found',
               duration_ms: Date.now() - startTime,
               type: 'auth'
          });

          return {
               success: false,
               error: "User not found with the provided email address.",
          }
     }

     if (!email || !email.includes("@") || !newPassword || !oldPassword) {

          log(`resetPasswordWithOldPassword invalid input for ${email}`, 'error');
          await logServerAction({
               user_id: null,
               action: 'Reset password - invalid input',
               payload: {},
               status: 'fail',
               error: '',
               duration_ms: Date.now() - startTime,
               type: 'auth'
          })

          return {
               success: false,
               error: "Please enter a valid email address and old and new passwords.",
          }
     }

     try {
          // Get the current session
          const { data: { session }, error: sessionError, } = await supabase.auth.getSession()

          if (sessionError || !session) {
               log(`resetPasswordWithOldPassword session error for ${email}: ${sessionError?.message || 'No session'}`, 'error');
               return {
                    success: false,
                    error: sessionError?.message || "No active session found",
               }
          }

          // Check if the old password is correct
          const { data: signedInUser, error: signInError } = await supabase.auth.signInWithPassword({ email: email, password: oldPassword })

          if (signInError) {
               log(`resetPasswordWithOldPassword sign-in error for ${email}: ${signInError.message}`, 'error');
               logServerAction({
                    user_id: null,
                    action: 'Reset password - old password incorrect',
                    payload: { email },
                    status: 'fail',
                    error: signInError.message,
                    duration_ms: Date.now() - startTime,
                    type: 'auth'
               })
               return {
                    success: false,
                    error: signInError?.message || "Failed to reset password",
               }
          }


          // Update the user's password
          const { error } = await supabase.auth.updateUser({ password: newPassword })

          if (error) {
               let errorMsg = "Failed to reset password";
               // Supabase error codes for password update
               // See: https://github.com/supabase/gotrue-js/blob/master/src/lib/errors.ts
               switch (error.status) {
                    case 422:
                         // Weak password
                         errorMsg = "Password is too weak. Please choose a stronger password.";
                         break;
                    case 400:
                         // Invalid password or request
                         if (error.message && error.message.toLowerCase().includes('password')) {
                              errorMsg = error.message;
                         } else {
                              errorMsg = "Invalid password or request.";
                         }
                         break;
                    case 429:
                         errorMsg = "Too many requests. Please try again later.";
                         break;
                    case 401:
                         errorMsg = "Unauthorized. Please log in again.";
                         break;
                    case 403:
                         errorMsg = "You do not have permission to perform this action.";
                         break;
                    default:
                         if (error.message) {
                              errorMsg = error.message;
                         }
                         break;
               }
               log(`resetPasswordWithOldPassword update error for ${email}: ${error.message}`, 'error');
               logServerAction({
                    user_id: null,
                    action: 'Reset password - password update failed',
                    payload: { email },
                    status: 'fail',
                    error: error.message,
                    duration_ms: Date.now() - startTime,
                    type: 'auth'
               })
               return {
                    success: false,
                    error: errorMsg,
               }
          }

          logServerAction({
               user_id: userId,
               action: 'Reset password - success',
               payload: { email },
               status: 'success',
               error: '',
               duration_ms: 0,
               type: 'action'
          })

          return {
               success: true,
          }
     } catch (error: any) {
          log(`resetPasswordWithOldPassword unexpected error for ${email}: ${error?.message || 'Unknown error'}`, 'error');
          logServerAction({
               user_id: null,
               action: 'Reset password - error',
               payload: { email },
               status: 'fail',
               error: error.message,
               duration_ms: Date.now() - startTime,
               type: 'auth'
          })
          return {
               success: false,
               error: error?.message || "Failed to reset password",
          }
     }
}

// ========================================
// CRUD Actions for PolarCustomer using Polar SDK
// ========================================

/**
 * Create a new PolarCustomer via Polar SDK
 * @param email - Customer email (required)
 * @param name - Customer name
 * @param avatarUrl - Customer avatar URL
 * @param billingAddress - Customer billing address
 * @param taxId - Customer tax IDs
 */
export const createPolarCustomerAction = async ({
     email,
     name,
     avatarUrl,
     billingAddress,
     taxId,
}: {
     email: string;
     name?: string | null;
     avatarUrl?: string | null;
     billingAddress?: PolarCustomerAddress | null;
     taxId?: (string | null)[] | null;
}): Promise<{
     success: boolean;
     data?: PolarCustomer;
     error?: string;
}> => {
     const startTime = Date.now();

     try {
          // Prepare billing address for Polar SDK
          const polarBillingAddress = billingAddress && billingAddress.country ? {
               country: billingAddress.country as any, // Type assertion for country code
               line1: billingAddress.line1 ?? undefined,
               line2: billingAddress.line2 ?? undefined,
               postalCode: billingAddress.postalCode ?? undefined,
               city: billingAddress.city ?? undefined,
               state: billingAddress.state ?? undefined,
          } : undefined;

          // Create customer via Polar SDK
          const customer = await polar.customers.create({
               email,
               name: name ?? undefined,
               metadata: avatarUrl ? { avatarUrl } : undefined,
               billingAddress: polarBillingAddress,
               taxId: taxId?.filter(Boolean) as string[] | undefined,
          });

          await logServerAction({
               action: 'Create PolarCustomer via SDK - Success',
               duration_ms: Date.now() - startTime,
               error: '',
               payload: { email, name },
               status: 'success',
               type: 'action',
               user_id: customer.id,
          });

          revalidatePath('/dashboard/customers');

          return {
               success: true,
               data: customer as unknown as PolarCustomer,
          };
     } catch (error: any) {
          const message = error?.message || 'Failed to create customer';
          log(`createPolarCustomerAction error for email ${email}: ${message}`, 'error');

          await logServerAction({
               action: 'Create PolarCustomer via SDK - Failed',
               duration_ms: Date.now() - startTime,
               error: message,
               payload: { email, name },
               status: 'fail',
               type: 'action',
               user_id: null,
          });

          return {
               success: false,
               error: message,
          };
     }
};

/**
 * Update an existing PolarCustomer via Polar SDK
 * Only updates: name, avatarUrl, billingAddress, taxId
 * @param customerId - Polar customer ID
 * @param name - Customer name
 * @param avatarUrl - Customer avatar URL
 * @param billingAddress - Customer billing address
 * @param taxId - Customer tax IDs
 */
export const updatePolarCustomerAction = async ({
     customerId,
     name,
     avatarUrl,
     billingAddress,
     taxId,
}: {
     customerId: string;
     name?: string | null;
     avatarUrl?: string | null;
     billingAddress?: PolarCustomerAddress | null;
     taxId?: (string | null)[] | null;
}): Promise<{
     success: boolean;
     data?: PolarCustomer;
     error?: string;
}> => {
     const startTime = Date.now();

     try {
          // Build update payload with only allowed fields
          const updatePayload: any = {};

          if (name !== undefined) updatePayload.name = name;
          if (avatarUrl !== undefined) {
               updatePayload.metadata = avatarUrl ? { avatarUrl } : {};
          }
          if (billingAddress !== undefined) {
               updatePayload.billingAddress = billingAddress && billingAddress.country ? {
                    country: billingAddress.country as any, // Type assertion for country code
                    line1: billingAddress.line1 ?? undefined,
                    line2: billingAddress.line2 ?? undefined,
                    postalCode: billingAddress.postalCode ?? undefined,
                    city: billingAddress.city ?? undefined,
                    state: billingAddress.state ?? undefined,
               } : undefined;
          }
          if (taxId !== undefined) updatePayload.taxId = taxId?.filter(Boolean) as string[] | undefined;

          // Update customer via Polar SDK
          const customer = await polar.customers.update({
               id: customerId,
               ...updatePayload,
          });

          await logServerAction({
               action: 'Update PolarCustomer via SDK - Success',
               duration_ms: Date.now() - startTime,
               error: '',
               payload: { customerId, ...updatePayload },
               status: 'success',
               type: 'action',
               user_id: customerId,
          });

          revalidatePath(`/dashboard/customers/${customerId}`);
          revalidatePath('/dashboard/customers');

          return {
               success: true,
               data: customer as unknown as PolarCustomer,
          };
     } catch (error: any) {
          const message = error?.message || 'Failed to update customer';
          log(`updatePolarCustomerAction error for customer ${customerId}: ${message}`, 'error');

          await logServerAction({
               action: 'Update PolarCustomer via SDK - Failed',
               duration_ms: Date.now() - startTime,
               error: message,
               payload: { customerId },
               status: 'fail',
               type: 'action',
               user_id: customerId,
          });

          return {
               success: false,
               error: message,
          };
     }
};

/**
 * Delete a PolarCustomer via Polar SDK
 * @param customerId - Polar customer ID
 */
export const deletePolarCustomerAction = async (
     customerId: string
): Promise<{
     success: boolean;
     error?: string;
}> => {
     const startTime = Date.now();

     try {
          // Delete customer via Polar SDK
          await polar.customers.delete({ id: customerId });

          await logServerAction({
               action: 'Delete PolarCustomer via SDK - Success',
               duration_ms: Date.now() - startTime,
               error: '',
               payload: { customerId },
               status: 'success',
               type: 'action',
               user_id: customerId,
          });

          revalidatePath('/dashboard/customers');

          return {
               success: true,
          };
     } catch (error: any) {
          const message = error?.message || 'Failed to delete customer';
          log(`deletePolarCustomerAction error for customer ${customerId}: ${message}`, 'error');

          await logServerAction({
               action: 'Delete PolarCustomer via SDK - Failed',
               duration_ms: Date.now() - startTime,
               error: message,
               payload: { customerId },
               status: 'fail',
               type: 'action',
               user_id: customerId,
          });

          return {
               success: false,
               error: message,
          };
     }
};

/**
 * Get a PolarCustomer by ID via Polar SDK
 * @param customerId - Polar customer ID
 */
export const getPolarCustomerAction = async (
     customerId: string
): Promise<{
     success: boolean;
     data?: PolarCustomer;
     error?: string;
}> => {
     try {
          const customer = await polar.customers.get({ id: customerId });

          return {
               success: true,
               data: customer as unknown as PolarCustomer,
          };
     } catch (error: any) {
          const message = error?.message || 'Failed to fetch customer';
          log(`getPolarCustomerAction error for customer ${customerId}: ${message}`, 'error');

          return {
               success: false,
               error: message,
          };
     }
};

/**
 * List all PolarCustomers via Polar SDK
 */
export const listPolarCustomersAction = async (): Promise<{
     success: boolean;
     data?: PolarCustomer[];
     error?: string;
}> => {
     try {
          // Fetch all customers with pagination
          const customers: any[] = [];
          let page = 1;
          let hasMore = true;

          while (hasMore) {
               const result = await polar.customers.list({ page, limit: 100 });

               // Collect results from async iterator
               for await (const customer of result) {
                    customers.push(customer);
               }

               // Check if there are more pages
               hasMore = customers.length >= page * 100;
               page++;
          }

          return {
               success: true,
               data: customers as unknown as PolarCustomer[],
          };
     } catch (error: any) {
          const message = error?.message || 'Failed to list customers';
          log(`listPolarCustomersAction error: ${message}`, 'error');

          return {
               success: false,
               error: message,
          };
     }
};

export const readAllCustomersAction = async (): Promise<{
     getAllCustomersActionSuccess: boolean;
     getAllCustomersActionData?: (PolarCustomer & { subscription_plan_name?: string | null })[];
     getAllCustomersActionError?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: customers, error } = await supabase
               .from(TABLES.POLAR_CUSTOMERS)
               .select('*');
          if (error) throw error;

          const baseCustomers = (customers ?? []) as PolarCustomer[];

          if (!baseCustomers.length) {
               return {
                    getAllCustomersActionSuccess: true,
                    getAllCustomersActionData: [],
               };
          }

          const customerIds = baseCustomers.map((c) => c.id).filter(Boolean);

          // Fetch mapping customerId -> subscription_id from tblCustomer_Subscription
          const { data: clientSubs, error: clientSubsError } = await supabase
               .from(TABLES.POLAR_CUSTOMERS)
               .select('id')
               .in('id', customerIds);

          if (clientSubsError) throw clientSubsError;

          const planIds = Array.from(
               new Set(
                    (clientSubs ?? [])
                         .map((row: any) => row?.subscription_id)
                         .filter(Boolean)
               )
          );

          let planNameById: Record<string, string> = {};

          if (planIds.length > 0) {
               const { data: plans, error: plansError } = await supabase
                    .from(TABLES.POLAR_SUBSCRIPTIONS)
                    .select('id, product')
                    .in('id', planIds);

               if (plansError) throw plansError;

               planNameById = (plans ?? []).reduce((acc: Record<string, string>, row: any) => {
                    if (row && row.id) {
                         acc[row.id] = row.name;
                    }
                    return acc;
               }, {});
          }

          const planIdByCustomerId: Record<string, string | null> = {};
          for (const row of clientSubs ?? []) {
               const r: any = row;
               if (r.customerId) {
                    planIdByCustomerId[r.customerId] = r.subscription_id ?? null;
               }
          }

          const enriched = baseCustomers.map((c) => {
               const planId = planIdByCustomerId[c.id] ?? null;
               const subscription_plan_name = planId ? planNameById[planId] ?? null : null;
               return { ...c, subscription_plan_name };
          });

          return {
               getAllCustomersActionSuccess: true,
               getAllCustomersActionData: enriched,
          };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readAllCustomersAction error: ${message}`, 'error');
          return {
               getAllCustomersActionSuccess: false,
               getAllCustomersActionData: [],
               getAllCustomersActionError: 'Failed to fetch customers',
          };
     }
};

export const readCustomerByIdAction = async (
     customerId: string
): Promise<{
     getCustomerByIdActionSuccess: boolean;
     getCustomerByIdActionData?: PolarCustomer;
     getCustomerByIdActionError?: string;
}> => {
     if (!isUUID(customerId)) {
          log(`readCustomerByIdAction invalid ID: ${customerId}`, 'error');
          return { getCustomerByIdActionSuccess: false, getCustomerByIdActionError: 'Invalid customer ID format' };
     }

     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase.from(TABLES.POLAR_CUSTOMERS).select('*').eq('id', customerId).single();
          if (error) throw error;
          if (!data) throw new Error('PolarCustomer not found');

          return {
               getCustomerByIdActionSuccess: true,
               getCustomerByIdActionData: data as PolarCustomer,
          };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readCustomerByIdAction error for id ${customerId}: ${message}`, 'error');
          return {
               getCustomerByIdActionSuccess: false,
               getCustomerByIdActionError: 'Failed to fetch customer',
          };
     }
};

export const deleteCustomerByIDsAction = async (
     ids: string[]
): Promise<{ deleteCustomerByIDsActionSuccess: boolean; deleteCustomerByIDsActionError?: string }> => {

     const anonSupabase = await useServerSideSupabaseAnonClient();
     const adminSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          // Fetch user_ids before deleting customers
          const { data: customersToDelete, error: fetchError } = await anonSupabase
               .from(TABLES.POLAR_CUSTOMERS)
               .select('externalId')
               .in('id', ids);

          if (fetchError) {
               log(`deleteCustomerByIDsAction fetch error for ids ${ids.join(', ')}: ${fetchError.message}`, 'error');
               throw fetchError;
          }

          const userIdsToDelete = customersToDelete.map((c: any) => c.externalId).filter(Boolean);

          // Delete from tblBuildings
          const { error: deleteBuildings } = await anonSupabase.from(TABLES.BUILDINGS).delete().in('customerId', ids);
          if (deleteBuildings) {
               log(`Error deleting customers with IDs: ${ids.join(', ')}: ${deleteBuildings.message}`, 'error');
               throw deleteBuildings
          };

          // Delete from tblCustomers
          const { error: deleteCustomerError } = await anonSupabase.from(TABLES.POLAR_CUSTOMERS).delete().in('id', ids);
          if (deleteCustomerError) {
               log(`Error deleting customers with IDs: ${ids.join(', ')}: ${deleteCustomerError.message}`, 'error');
               throw deleteCustomerError
          };

          // Delete from auth.users
          const failedDeletes: string[] = [];
          for (const userId of userIdsToDelete) {
               const { error: deleteUserError } = await adminSupabase.auth.admin.deleteUser(userId);
               if (deleteUserError) {
                    log(`Error deleting auth.user with ID: ${userId}: ${deleteUserError.message}`, 'error');
                    failedDeletes.push(userId);
               }
          }

          revalidatePath('/dashboard/customers');

          if (failedDeletes.length > 0) {
               return {
                    deleteCustomerByIDsActionSuccess: false,
                    deleteCustomerByIDsActionError: `Failed to delete auth.users for: ${failedDeletes.join(', ')}`,
               };
          }

          return { deleteCustomerByIDsActionSuccess: true };
     } catch (error: any) {
          log(`deleteCustomerByIDsAction error for ids ${ids.join(', ')}: ${error?.message || 'Unknown error'}`, 'error');
          return {
               deleteCustomerByIDsActionSuccess: false,
               deleteCustomerByIDsActionError: error.message,
          };
     }
};

export const readCustomerByEmailAction = async (
     email: string
): Promise<{ getCustomerByEmailActionSuccess: boolean; getCustomerByEmailActionData?: PolarCustomer }> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data, error } = await supabase.from(TABLES.POLAR_CUSTOMERS).select().eq('email', email).single();
          if (error) throw error;
          return { getCustomerByEmailActionSuccess: true, getCustomerByEmailActionData: data };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readCustomerByEmailAction error for email ${email}: ${message}`, 'error');
          return { getCustomerByEmailActionSuccess: false };
     }
};

export const readAllTenantsFromCustomerIdAction = async (customerId: string): Promise<{ tenants: Tenant[] }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     if (!isUUID(customerId)) {
          log(`readAllTenantsFromCustomerIdAction invalid customerId: ${customerId}`, 'error');
          return { tenants: [] };
     }

     try {
          const { data: buildings, error: buildingsError } = await supabase
               .from(TABLES.BUILDINGS)
               .select('id')
               .eq('customerId', customerId);

          if (buildingsError) throw buildingsError;
          const buildingIds = (buildings ?? []).map((b: any) => b.id).filter(Boolean);
          if (buildingIds.length === 0) return { tenants: [] };

          const { data: apartments, error: apartmentsError } = await supabase
               .from(TABLES.APARTMENTS)
               .select('id')
               .in('building_id', buildingIds);

          if (apartmentsError) throw apartmentsError;
          const apartmentIds = (apartments ?? []).map((a: any) => a.id).filter(Boolean);
          if (apartmentIds.length === 0) return { tenants: [] };

          const { data: tenants, error: tenantsError } = await supabase
               .from(TABLES.TENANTS)
               .select(`
                    *,
                    apartment:tblApartments (
                         id,
                         apartment_number,
                         building:tblBuildings (
                              id,
                              building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                                   street_address,
                                   city
                              )
                         )
                    )
               `)
               .in('apartment_id', apartmentIds);

          if (tenantsError) {
               log(`readAllTenantsFromCustomerIdAction tenants error for customerId ${customerId}: ${tenantsError.message}`, 'error');
               throw tenantsError
          };

          return { tenants: (tenants ?? []) as Tenant[] };
     } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          log(`readAllTenantsFromCustomerIdAction error for customer ${customerId}: ${message}`, 'error');
          return { tenants: [] };
     }
}

// --- Social profile helpers for customers ---
const calculateCustomerProfileProgress = (profile: Partial<{ first_name?: string; last_name?: string; phone_number?: string; bio?: string; avatar_url?: string; cover_image_url?: string; current_city?: string; current_job_title?: string; current_job_company?: string; previous_job_title?: string; previous_job_company?: string; origin_city?: string; quote?: string; }>): number => {
     const fields = [
          'first_name',
          'last_name',
          'phone_number',
          'bio',
          'avatar_url',
          'cover_image_url',
          'current_city',
          'current_job_title',
          'current_job_company',
          'previous_job_title',
          'previous_job_company',
          'origin_city',
          'quote',
     ];
     const completed = fields.filter((field) => {
          const value = (profile as any)[field];
          return value && value.toString().trim().length > 0;
     });
     return Math.round((completed.length / fields.length) * 100);
};

export const getCustomerBuildingsForSocialProfile = async (
     clientId?: string
): Promise<{ success: boolean; data?: CustomerBuildingOption[]; error?: string }> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const viewer = await getViewer();
     const effectiveCustomerId = clientId ?? viewer.customer?.id

     if (!effectiveCustomerId) {
          log('getCustomerBuildingsForSocialProfile error: PolarCustomer not found', 'error');
          return { success: false, error: 'PolarCustomer not found' };
     }

     const { data, error } = await supabase
          .from(TABLES.BUILDINGS)
          .select(`
               id,
               building_location:tblBuildingLocations!tblBuildings_building_location_fkey (
                    street_address,
                    city,
                    country
               )
          `)
          .eq('customerId', effectiveCustomerId)
          .order('created_at', { ascending: false });

     if (error) {
          log(`getCustomerBuildingsForSocialProfile error for clientId ${effectiveCustomerId}: ${error.message}`, 'error');
          return { success: false, error: error.message };
     }

     const options: CustomerBuildingOption[] = (data ?? []).map((row: any) => {
          const location = row.building_location as any;
          const labelPieces = [location?.street_address, location?.city].filter(Boolean);
          const label = labelPieces.length ? labelPieces.join(', ') : 'Building';
          return {
               id: row.id,
               label,
               street_address: location?.street_address,
               city: location?.city,
          };
     });

     return { success: true, data: options };
};

// export const createCustomerSocialProfile = async (buildingId: string): Promise<{ success: boolean; error?: string }> => {
//      const supabase = await useServerSideSupabaseAnonClient();
//      const viewer = await getViewer();
//      const customer = viewer.customer ?? null;
//      const clientId = customer?.id ?? null

//      if (!clientId) {
//           log('createCustomerSocialProfile error: PolarCustomer not found', 'error');
//           return { success: false, error: 'PolarCustomer not found' };
//      }

//      if (!buildingId || !isUUID(buildingId)) {
//           log('createCustomerSocialProfile error: Invalid building selected', 'error');
//           return { success: false, error: 'Invalid building selected' };
//      }

//      // Ensure the selected building belongs to this customer
//      const { data: buildingRow, error: buildingError } = await supabase
//           .from(TABLES.BUILDINGS)
//           .select(`
//                id,
//                customerId,
//                building_location:tblBuildingLocations!tblBuildings_building_location_fkey (city)
//           `)
//           .eq('id', buildingId)
//           .single();

//      if (buildingError || !buildingRow) {
//           log(`createCustomerSocialProfile error: ${buildingError?.message ?? 'Building not found'}`, 'error');
//           return { success: false, error: buildingError?.message ?? 'Building not found' };
//      }

//      if (buildingRow.customerId !== clientId) {
//           log('createCustomerSocialProfile error: Building does not belong to this customer', 'error');
//           return { success: false, error: 'Building does not belong to this customer' };
//      }

//      const { data: clientRow, error: customerError } = await supabase
//           .from(TABLES.POLAR_CUSTOMERS)
//           .select('id, name, email')
//           .eq('id', clientId)
//           .single();

//      if (customerError || !clientRow) {
//           log(`createCustomerSocialProfile error: ${customerError?.message ?? 'PolarCustomer not found'}`, 'error');
//           return { success: false, error: customerError?.message ?? 'PolarCustomer not found' };
//      }

//      const profilePayload = {
//           id: clientId,
//           tenant_id: clientId,
//           customerId: clientId,
//           name: clientRow.name || '',
//           email: clientRow.email || '',
//           billingAddress: buildingRow.billingAddress.city as any || '',
//      };

//      const profile_progress = calculateCustomerProfileProgress(profilePayload);
//      const nowIso = new Date().toISOString();

//      const { error: upsertError } = await supabase
//           .from(TABLES.TENANT_PROFILES)
//           .upsert(
//                {
//                     ...profilePayload,
//                     profile_progress,
//                     updated_at: nowIso,
//                     created_at: nowIso,
//                },
//                { onConflict: 'id' }
//           );

//      if (upsertError) {
//           log(`createCustomerSocialProfile upsert error: ${upsertError.message}`, 'error');
//           return { success: false, error: upsertError.message };
//      }

//      revalidatePath('/dashboard/social/profile');
//      revalidatePath('/dashboard/social');
//      return { success: true };
// };

// Returns true if the provided userId corresponds to a PolarCustomer record; false if tenant or not found.
export const isCustomerUserId = async (userId: string): Promise<boolean> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const { data: customer, error: customerError } = await supabase.from(TABLES.POLAR_CUSTOMERS).select('customerId').eq('externalId', userId).single();
     if (customerError) log(`isCustomerUserId error (customer): ${customerError.message}`, 'error');
     if (customer && isUUIDv4(customer.customerId) && !customerError) return true;
     const { data: tenant, error: tenantError } = await supabase.from(TABLES.TENANTS).select('id').eq('user_id', userId).single();
     if (tenantError) log(`isCustomerUserId error (tenant): ${tenantError.message}`, 'error');
     if (tenant && isUUIDv4(tenant.id) && !tenantError) return false;
     return !!tenant;
}


