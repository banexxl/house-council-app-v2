"use server";

import { User } from '@supabase/supabase-js'
import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server'
import { Tenant } from 'src/types/tenant'
import { Admin } from 'src/types/admin'
import { Feature } from 'src/types/base-entity'
import { cache } from 'react';
import { TABLES } from 'src/libs/supabase/tables';
import { updateTenantActivityStatus, getCustomerIdFromTenantBuilding } from 'src/app/actions/tenant/tenant-actions';
import { PolarCustomer } from 'src/types/polar-customer-types';

export type UserDataCombined = {
     customer: PolarCustomer | null
     tenant: Tenant | null
     admin: Admin | null
     userData: User | null
     error?: string
     /** Features allowed by the client's subscription plan (filtered for tenants) */
     allowedFeatures?: Feature[]
     allowedFeatureSlugs?: string[]
     subscriptionPlanId?: string | null
}

/**
 * One call per request; all RSCs share via React's cache()
 * - Reads session/user from cookie-bound client (auth)
 * - Uses your service-role client for cross-table lookups
 * - Runs role lookups in parallel, prefers first non-null in priority order
 */
export const getViewer = cache(async (): Promise<UserDataCombined> => {
     const tenantSelect = `
          *,
          apartment:${TABLES.APARTMENTS}(
               id,
               apartment_number,
               building:${TABLES.BUILDINGS}(
                    id
               )
          )
     `;

     // Auth (cookie-aware) — do NOT use service role for reading the session
     const authSb = await useServerSideSupabaseAnonClient();
     const { data: { user }, error: userErr } = await authSb.auth.getUser();

     if (userErr || !user) {
          return {
               customer: null,
               tenant: null,
               admin: null,
               userData: null,
               error: userErr?.message || 'Failed to authenticate user',
          };
     }

     // DB lookups (you already use service role; keep it if you need to bypass RLS)
     const supabase = await useServerSideSupabaseServiceRoleClient();

     // Run in parallel
     const [customerRes, tenantRes, adminRes] = await Promise.all([
          supabase.from(TABLES.POLAR_CUSTOMERS).select('*').eq('externalId', user.id).single(),
          supabase.from(TABLES.TENANTS).select(tenantSelect).eq('user_id', user.id).single(),
          supabase.from(TABLES.SUPER_ADMINS).select('*').eq('user_id', user.id).single(),
     ]);

     const customer: PolarCustomer | null = !customerRes.error && customerRes.data ? customerRes.data as unknown as PolarCustomer : null;
     const tenant: Tenant | null = !tenantRes.error && tenantRes.data ? tenantRes.data as unknown as Tenant : null;
     const admin: Admin | null = !adminRes.error && adminRes.data ? adminRes.data as unknown as Admin : null;

     // Choose the first matching role by your preferred priority
     const result: UserDataCombined = {
          customer,
          tenant,
          admin,
          userData: user,
     };

     if (!customer && !tenant && !admin) {
          result.error = 'User record not found';
     }

     if (tenant) {
          const { error } = await updateTenantActivityStatus(tenant.id, true, new Date());
          if (error) {
               console.error('Failed to update tenant activity status:', error);
          }
     }

     // Resolve client id for feature access (client or tenant via building)
     let featureCustomerId: string | null = customer?.id ?? null;
     if (!featureCustomerId && tenant) {
          // First, try to resolve via joined apartment/building (if relation is configured)
          if (tenant.apartment?.building?.id) {
               const { data: building, error: buildingError } = await supabase
                    .from(TABLES.BUILDINGS)
                    .select('customerId')
                    .eq('id', tenant.apartment.building.id)
                    .single();
               featureCustomerId = buildingError?.code === 'PGRST116' ? null : building?.customerId ?? null;
          }

          // Fallback: use robust helper that walks TENANTS -> APARTMENTS -> BUILDINGS
          if (!featureCustomerId) {
               const { success, data } = await getCustomerIdFromTenantBuilding(tenant.id);
               if (success && data) {
                    featureCustomerId = data;
               }
          }
     }

     let allowedFeatures: Feature[] = [];
     let allowedFeatureSlugs: string[] = [];
     let subscriptionPlanId: string | null = null;

     if (featureCustomerId) {
          const { data: clientSubscription, error: subscriptionError } = await supabase
               .from(TABLES.POLAR_SUBSCRIPTIONS)
               .select('id, productId')
               .eq('customerId', featureCustomerId)
               .single();
          subscriptionPlanId = subscriptionError?.code === 'PGRST116' ? null : clientSubscription?.id ?? null;
          const productId = subscriptionError?.code === 'PGRST116' ? null : clientSubscription?.productId ?? null;
          if (productId) {
               // Fetch product metadata from tblPolarProduct
               const { data: productData, error: productError } = await supabase
                    .from(TABLES.POLAR_PRODUCTS)
                    .select('metadata')
                    .eq('id', productId)
                    .single();
               if (!productError && productData?.metadata) {
                    const featuresMetadata = productData.metadata as Record<string, string>;

                    // Fetch all features from the features table
                    const { data: allFeatures, error: featuresError } = await supabase
                         .from(TABLES.FEATURES)
                         .select('*');

                    if (!featuresError && Array.isArray(allFeatures)) {
                         // Filter features based on what's in the product metadata
                         allowedFeatures = (allFeatures as Feature[]).filter((feature) =>
                              feature.slug && featuresMetadata.hasOwnProperty(feature.slug)
                         );

                         allowedFeatureSlugs = allowedFeatures
                              .map((f) => f.slug)
                              .filter(Boolean) as string[];
                    }
               }
          }
     }
     // Tenants inherit client features except location/tenant management
     if (tenant && !customer && allowedFeatures.length > 0) {
          const tenantBlocked = new Set(['geo-location-management']);
          allowedFeatures = allowedFeatures.filter((f) => !tenantBlocked.has((f.slug || '').toLowerCase()));
          allowedFeatureSlugs = allowedFeatures
               .map((f) => f.slug)
               .filter(Boolean) as string[];
     }

     if (featureCustomerId) {
          result.allowedFeatures = allowedFeatures;
          result.allowedFeatureSlugs = allowedFeatureSlugs.map((s) => s.toLowerCase());
          result.subscriptionPlanId = subscriptionPlanId;
     }

     return result;
});
