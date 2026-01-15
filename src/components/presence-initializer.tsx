'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Tenant } from 'src/types/tenant';
import type { Admin } from 'src/types/admin';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { subscribeToBuildingPresence, unsubscribeFromBuildingPresence, PresenceUser } from 'src/realtime/user-presence';
import log from 'src/utils/logger';
import { PolarCustomer } from 'src/types/polar-customer-types';

type ViewerData = {
     customer: PolarCustomer | null;
     tenant: Tenant | null;
     admin: Admin | null;
     userData: User | null;
     error?: string;
};

/**
 * Component that automatically sets up building presence when a user is logged in.
 * This should be placed at the layout level to ensure presence is active throughout the session.
 */
export const PresenceInitializer = () => {
     const currentBuildingIdRef = useRef<string | null>(null);
     const [viewer, setViewer] = useState<ViewerData | null>(null);

     useEffect(() => {
          let active = true;
          let authSubscription: ReturnType<typeof supabaseBrowserClient.auth.onAuthStateChange>['data']['subscription'] | null = null;

          const fetchViewer = async () => {
               try {
                    const response = await fetch('/api/viewer', { cache: 'no-store' });
                    const data: ViewerData = await response.json();

                    if (active) {
                         setViewer(data);
                    }

                    if (!response.ok) {
                         throw new Error(data?.error || `Failed to fetch viewer (${response.status})`);
                    }
               } catch (error) {
                    if (active) {
                         setViewer(null);
                    }
                    log('[PresenceInitializer] Failed to fetch viewer from server', 'error');
               }
          };

          fetchViewer();

          const authChange = supabaseBrowserClient?.auth.onAuthStateChange(() => {
               fetchViewer();
          });

          authSubscription = authChange?.data?.subscription ?? null;

          return () => {
               active = false;
               authSubscription?.unsubscribe();
               if (currentBuildingIdRef.current) {
                    unsubscribeFromBuildingPresence(currentBuildingIdRef.current);
                    currentBuildingIdRef.current = null;
               }
          };
     }, []);

     useEffect(() => {
          let mounted = true;

          const setupPresence = async () => {
               if (currentBuildingIdRef.current) {
                    await unsubscribeFromBuildingPresence(currentBuildingIdRef.current);
                    currentBuildingIdRef.current = null;
               }

               if (!viewer) {
                    return;
               }

               if (!viewer.userData?.id) {
                    log('[PresenceInitializer] No authenticated user, skipping presence setup');
                    return;
               }

               let buildingId: string | null = null;
               let userInfo: Partial<PresenceUser> = {};

               if (viewer.tenant) {
                    const apartment = viewer.tenant.apartment;
                    if (apartment && typeof apartment === 'object') {
                         const apartmentData = apartment as any;
                         buildingId = apartmentData.building_id || apartmentData.building?.id || null;
                    }

                    userInfo = {
                         username: viewer.tenant.email,
                         first_name: viewer.tenant.first_name,
                         last_name: viewer.tenant.last_name,
                         apartment_number: apartment ? String((apartment as any)?.apartment_number || '') : undefined,
                    };
               } else if (viewer.customer) {
                    log('[PresenceInitializer] Customer user detected, skipping automatic presence setup', 'info');
                    return;
               }

               if (!buildingId) {
                    log('[PresenceInitializer] No building ID found, skipping presence setup');
                    return;
               }

               if (!mounted) return;

               try {
                    log(`[PresenceInitializer] Setting up presence for building ${buildingId}, user ${viewer.userData.id}`);

                    const channel = await subscribeToBuildingPresence(
                         buildingId,
                         viewer.userData.id,
                         userInfo
                    );

                    if (channel && mounted) {
                         currentBuildingIdRef.current = buildingId;
                         log(`[PresenceInitializer] Successfully set up presence for building ${buildingId}`);
                    }
               } catch (error) {
                    log('[PresenceInitializer] Error setting up presence:', 'error');
               }
          };

          setupPresence();

          // Cleanup function
          return () => {
               mounted = false;
          };
     }, [viewer?.userData?.id, viewer?.tenant?.id, viewer?.customer?.id]);

     // This component doesn't render anything
     return null;
};
