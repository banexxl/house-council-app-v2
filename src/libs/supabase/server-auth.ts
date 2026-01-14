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
          console.log(`[getViewer] No authenticated user: ${userErr}`);
          return {
               customer: null,
               tenant: null,
               admin: null,
               userData: null,
               error: userErr?.message || 'Failed to authenticate user',
          };
     }

     // DB lookups (you already use service role; keep it if you need to bypass RLS)
     const db = await useServerSideSupabaseServiceRoleClient();

     // Helper that returns null instead of throwing for "no rows"
     const maybeSingle = <T,>(q: any) =>
          q.single().then((r: any) => r.data as T).catch((e: any) => {
               // PGRST116 = No rows found
               if (e?.code === 'PGRST116') return null;
               throw e;
          });

     // Run in parallel
     const [customer, tenant, admin] = await Promise.all([
          maybeSingle(db.from(TABLES.POLAR_CUSTOMERS).select('*').eq('externalId', user.id)),
          maybeSingle(db.from(TABLES.TENANTS).select(tenantSelect).eq('user_id', user.id)),
          maybeSingle(db.from(TABLES.SUPER_ADMINS).select('*').eq('user_id', user.id)),
     ]).catch((err) => {
          return [null, null, null, null] as const;
     });

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
               const building = await maybeSingle<{ customerId: string | null }>(
                    db.from(TABLES.BUILDINGS).select('customerId').eq('id', tenant.apartment.building.id),
               );
               featureCustomerId = building?.customerId ?? null;
          }

          // Fallback: use robust helper that walks TENANTS -> APARTMENTS -> BUILDINGS
          if (!featureCustomerId) {
               const { success, data } = await getCustomerIdFromTenantBuilding(tenant.id);
               if (success && data) {
                    featureCustomerId = data;
               }
               console.log('featureCustomerId via getCustomerIdFromTenantBuilding', featureCustomerId);
          }
     }

     let allowedFeatures: Feature[] = [];
     let allowedFeatureSlugs: string[] = [];
     let subscriptionPlanId: string | null = null;

     if (featureCustomerId) {
          const clientSubscription = await maybeSingle<{ subscriptionId: string | null }>(
               db.from(TABLES.POLAR_SUBSCRIPTIONS)
                    .select('subscriptionId')
                    .eq('customerId', featureCustomerId),
          );
          subscriptionPlanId = clientSubscription?.subscriptionId ?? null;
          if (subscriptionPlanId) {
               const { data: featureLinks, error: featureLinksError } = await db
                    .from(TABLES.SUBSCRIPTION_PLANS_FEATURES)
                    .select('feature_id')
                    .eq('subscription_plan_id', subscriptionPlanId);

               if (!featureLinksError) {
                    const featureIds = (featureLinks ?? [])
                         .map((row: any) => row?.feature_id)
                         .filter(Boolean);

                    if (featureIds.length > 0) {
                         const { data: featuresData, error: featuresError } = await db
                              .from(TABLES.FEATURES)
                              .select('*')
                              .in('id', featureIds);

                         if (!featuresError && Array.isArray(featuresData)) {
                              allowedFeatures = featuresData as Feature[];

                              allowedFeatureSlugs = allowedFeatures
                                   .map((f) => f.slug)
                                   .filter(Boolean) as string[];
                         }
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
