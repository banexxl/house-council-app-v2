'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from 'src/contexts/auth/auth-provider';
import { subscribeToBuildingPresence, unsubscribeFromBuildingPresence, PresenceUser } from 'src/realtime/user-presence';
import log from 'src/utils/logger';

/**
 * Component that automatically sets up building presence when a user is logged in.
 * This should be placed at the layout level to ensure presence is active throughout the session.
 */
export const PresenceInitializer = () => {
     const auth = useAuth();
     const currentBuildingIdRef = useRef<string | null>(null);

     useEffect(() => {
          let mounted = true;

          const setupPresence = async () => {
               // Clean up previous subscription if building changed
               if (currentBuildingIdRef.current) {
                    await unsubscribeFromBuildingPresence(currentBuildingIdRef.current);
                    currentBuildingIdRef.current = null;
               }

               // Only set up presence if user is authenticated and we can determine building
               if (!auth.userData?.id) {
                    log('[PresenceInitializer] No authenticated user, skipping presence setup');
                    return;
               }

               let buildingId: string | null = null;
               let userInfo: Partial<PresenceUser> = {};

               // Extract building ID and user info based on user type
               if (auth.tenant) {
                    // For tenants, get building from apartment
                    const apartment = auth.tenant.apartment;
                    if (apartment && typeof apartment === 'object') {
                         const apartmentData = apartment as any;
                         buildingId = apartmentData.building_id || apartmentData.building?.id || null;
                    }

                    userInfo = {
                         username: auth.tenant.email,
                         first_name: auth.tenant.first_name,
                         last_name: auth.tenant.last_name,
                         apartment_number: apartment ? String((apartment as any)?.apartment_number || '') : undefined,
                    };
               } else if (auth.client) {
                    // For clients, we might need to get building info differently
                    // For now, let's skip automatic presence for clients as they might manage multiple buildings
                    log('[PresenceInitializer] Client user detected, skipping automatic presence setup');
                    return;
               } else if (auth.clientMember) {
                    // Similar to clients, client members might have access to multiple buildings
                    log('[PresenceInitializer] Client member detected, skipping automatic presence setup');
                    return;
               }

               if (!buildingId) {
                    log('[PresenceInitializer] No building ID found, skipping presence setup');
                    return;
               }

               if (!mounted) return;

               try {
                    log(`[PresenceInitializer] Setting up presence for building ${buildingId}, user ${auth.userData.id}`);

                    const channel = await subscribeToBuildingPresence(
                         buildingId,
                         auth.userData.id,
                         userInfo
                    );

                    if (channel && mounted) {
                         currentBuildingIdRef.current = buildingId;
                         log(`[PresenceInitializer] Successfully set up presence for building ${buildingId}`);
                    }
               } catch (error) {
                    log('[PresenceInitializer] Error setting up presence:', error);
               }
          };

          setupPresence();

          // Cleanup function
          return () => {
               mounted = false;
               if (currentBuildingIdRef.current) {
                    unsubscribeFromBuildingPresence(currentBuildingIdRef.current);
                    currentBuildingIdRef.current = null;
               }
          };
     }, [auth.userData?.id, auth.tenant?.id, auth.client?.id, auth.clientMember?.id]);

     // This component doesn't render anything
     return null;
};