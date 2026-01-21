'use client';

import React from 'react';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import log from 'src/utils/logger';

interface PresenceUser {
     user_id: string;
     username?: string;
     first_name?: string;
     last_name?: string;
     apartment_number?: string;
     online_at: string;
}

interface BuildingPresenceState {
     [user_id: string]: PresenceUser[];
}

// Global state for managing building presence (functional approach)
const presenceState = {
     channels: new Map<string, RealtimeChannel>(),
     presenceStates: new Map<string, BuildingPresenceState>(),
     callbacks: new Map<string, Set<(users: PresenceUser[]) => void>>(),
};

// Helper function to notify callbacks when presence changes
const notifyCallbacks = (channelName: string): void => {
     const buildingId = channelName.split(':')[1];
     const users = getBuildingPresenceUsers(buildingId);
     const callbacks = presenceState.callbacks.get(channelName);

     if (callbacks) {
          callbacks.forEach(callback => {
               try {
                    callback(users);
               } catch (error) {
                    log('Error in presence callback:', error);
               }
          });
     }
};

const subscribeToSingleBuildingPresence = async (
     buildingId: string,
     userId: string,
     userInfo: Partial<PresenceUser>
): Promise<RealtimeChannel | null> => {
     const channelName = `building:${buildingId}:presence`;

     // If already subscribed to this building, return existing channel
     if (presenceState.channels.has(channelName)) {
          log(`Already subscribed to building ${buildingId} presence`);
          return presenceState.channels.get(channelName)!;
     }

     try {
          const channel = supabaseBrowserClient
               .channel(channelName, {
                    config: {
                         presence: {
                              key: userId,
                         },
                    },
               })
               .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    presenceState.presenceStates.set(channelName, state as unknown as BuildingPresenceState);
                    notifyCallbacks(channelName);
                    log(`Presence sync for building ${buildingId} - ${Object.keys(state).length} users online`);
               })
               .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    log(`User ${key} joined building ${buildingId} - ${newPresences.length} presence(s)`);
                    notifyCallbacks(channelName);
               })
               .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    log(`User ${key} left building ${buildingId} - ${leftPresences.length} presence(s)`);
                    notifyCallbacks(channelName);
               })
               .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                         log(`Successfully subscribed to building ${buildingId} presence`);

                         // Track current user's presence
                         const presenceData: PresenceUser = {
                              user_id: userId,
                              online_at: new Date().toISOString(),
                              ...userInfo,
                         };

                         await channel.track(presenceData);
                         log(`Tracking presence for user ${userId} in building ${buildingId}`);
                    } else if (status === 'CHANNEL_ERROR') {
                         log(`Error subscribing to building ${buildingId} presence`);
                    } else if (status === 'TIMED_OUT') {
                         log(`Timeout subscribing to building ${buildingId} presence`);
                    }
               });

          presenceState.channels.set(channelName, channel);
          presenceState.presenceStates.set(channelName, {});

          return channel;
     } catch (error) {
          log('Error setting up building presence subscription:', error);
          return null;
     }
};

/**
 * Subscribe to presence for one or more buildings
 * @param buildingIds - The building ID(s) to subscribe to
 * @param userId - The current user's ID
 * @param userInfo - Additional user information to share in presence
 * @returns Promise<RealtimeChannel[] | null>
 */
export const subscribeToBuildingPresence = async (
     buildingIds: string | string[],
     userId: string,
     userInfo: Partial<PresenceUser> = {}
): Promise<RealtimeChannel[] | null> => {
     if (!supabaseBrowserClient) {
          log('Supabase client not available');
          return null;
     }

     const buildingIdList = Array.isArray(buildingIds) ? buildingIds : [buildingIds];
     const uniqueBuildingIds = Array.from(new Set(buildingIdList.filter(Boolean)));

     if (uniqueBuildingIds.length === 0) {
          log('No building IDs provided for presence subscription');
          return null;
     }

     const channels = await Promise.all(
          uniqueBuildingIds.map((buildingId) =>
               subscribeToSingleBuildingPresence(buildingId, userId, userInfo)
          )
     );

     const activeChannels = channels.filter((channel): channel is RealtimeChannel => Boolean(channel));
     return activeChannels.length ? activeChannels : null;
};

/**
 * Get all users currently present in a building
 * @param buildingId - The building ID
 * @returns Array of present users
 */
export const getBuildingPresenceUsers = (buildingId: string): PresenceUser[] => {
     const channelName = `building:${buildingId}:presence`;
     const channel = presenceState.channels.get(channelName);

     if (!channel) {
          return [];
     }

     // Get the current presence state directly from the channel
     const presenceStateData = channel.presenceState();
     const users: PresenceUser[] = [];

     // Flatten presence state to get all users
     Object.entries(presenceStateData).forEach(([userId, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
               // Take the most recent presence data for each user
               const latestPresence = presences[presences.length - 1];
               if (latestPresence && typeof latestPresence === 'object' && 'user_id' in latestPresence) {
                    users.push(latestPresence as unknown as PresenceUser);
               }
          }
     });

     // Sort by online time (most recent first)
     return users.sort((a, b) =>
          new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
     );
};

/**
 * Get user IDs of all users currently present in a building
 * @param buildingId - The building ID
 * @returns Array of user IDs
 */
export const getBuildingPresenceUserIds = (buildingId: string): string[] => {
     return getBuildingPresenceUsers(buildingId).map(user => user.user_id);
};

/**
 * Subscribe to presence updates for a building
 * @param buildingId - The building ID
 * @param callback - Function to call when presence changes
 */
export const onBuildingPresenceChange = (
     buildingId: string,
     callback: (users: PresenceUser[]) => void
): () => void => {
     const channelName = `building:${buildingId}:presence`;

     if (!presenceState.callbacks.has(channelName)) {
          presenceState.callbacks.set(channelName, new Set());
     }

     presenceState.callbacks.get(channelName)!.add(callback);

     // Return unsubscribe function
     return () => {
          presenceState.callbacks.get(channelName)?.delete(callback);
     };
};

/**
 * Unsubscribe from building presence
 * @param buildingIds - The building ID(s)
 */
export const unsubscribeFromBuildingPresence = async (buildingIds: string | string[]): Promise<void> => {
     const buildingIdList = Array.isArray(buildingIds) ? buildingIds : [buildingIds];
     const uniqueBuildingIds = Array.from(new Set(buildingIdList.filter(Boolean)));

     await Promise.all(
          uniqueBuildingIds.map(async (buildingId) => {
               const channelName = `building:${buildingId}:presence`;
               const channel = presenceState.channels.get(channelName);

               if (channel) {
                    await supabaseBrowserClient?.removeChannel(channel);
                    presenceState.channels.delete(channelName);
                    presenceState.presenceStates.delete(channelName);
                    presenceState.callbacks.delete(channelName);
                    log(`Unsubscribed from building ${buildingId} presence`);
               }
          })
     );
};

/**
 * Update current user's presence data
 * @param buildingId - The building ID
 * @param userInfo - Updated user information
 */
export const updatePresence = async (buildingId: string, userInfo: Partial<PresenceUser>): Promise<void> => {
     const channelName = `building:${buildingId}:presence`;
     const channel = presenceState.channels.get(channelName);

     if (channel) {
          const currentPresence = getBuildingPresenceUsers(buildingId)
               .find(user => user.user_id === userInfo.user_id);

          const updatedPresence: PresenceUser = {
               ...currentPresence,
               ...userInfo,
               online_at: new Date().toISOString(),
          } as PresenceUser;

          await channel.track(updatedPresence);
          log(`Updated presence for user ${userInfo.user_id} in building ${buildingId}`);
     }
};

/**
 * Cleanup all subscriptions
 */
export const cleanupAllPresenceSubscriptions = async (): Promise<void> => {
     const channelNames = Array.from(presenceState.channels.keys());

     for (const channelName of channelNames) {
          const buildingId = channelName.split(':')[1];
          await unsubscribeFromBuildingPresence(buildingId);
     }

     log('Cleaned up all building presence subscriptions');
};

// Export types
export type { PresenceUser, BuildingPresenceState };

// React hook for easier integration
export const useBuildingPresence = (buildingIds: string | string[] | null, userId: string | null, userInfo?: Partial<PresenceUser>) => {
     const [presenceUsers, setPresenceUsers] = React.useState<PresenceUser[]>([]);
     const [isConnected, setIsConnected] = React.useState(false);

     const normalizedBuildingIds = React.useMemo(() => {
          if (!buildingIds) {
               return [] as string[];
          }

          const buildingIdList = Array.isArray(buildingIds) ? buildingIds : [buildingIds];
          return Array.from(new Set(buildingIdList.filter(Boolean))).sort();
     }, [buildingIds]);

     const buildingKey = normalizedBuildingIds.join('|');

     React.useEffect(() => {
          if (normalizedBuildingIds.length === 0 || !userId) {
               setPresenceUsers([]);
               setIsConnected(false);
               return;
          }

          let unsubscribeCallbacks: Array<() => void> = [];
          let isActive = true;

          const refreshPresenceUsers = () => {
               if (!isActive) {
                    return;
               }

               const combinedUsers = normalizedBuildingIds.flatMap((buildingId) =>
                    getBuildingPresenceUsers(buildingId)
               );
               const uniqueUsers = new Map<string, PresenceUser>();

               combinedUsers.forEach((user) => {
                    const existing = uniqueUsers.get(user.user_id);
                    if (!existing) {
                         uniqueUsers.set(user.user_id, user);
                         return;
                    }

                    const existingTime = new Date(existing.online_at).getTime();
                    const currentTime = new Date(user.online_at).getTime();
                    if (currentTime > existingTime) {
                         uniqueUsers.set(user.user_id, user);
                    }
               });

               const mergedUsers = Array.from(uniqueUsers.values()).sort((a, b) =>
                    new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
               );
               setPresenceUsers(mergedUsers);
          };

          const setupPresence = async () => {
               try {
                    // Subscribe to building presence
                    const channels = await subscribeToBuildingPresence(normalizedBuildingIds, userId, userInfo);

                    if (channels?.length) {
                         setIsConnected(true);

                         // Listen for presence changes
                         unsubscribeCallbacks = normalizedBuildingIds.map((buildingId) =>
                              onBuildingPresenceChange(buildingId, refreshPresenceUsers)
                         );

                         // Get initial state
                         refreshPresenceUsers();
                    } else {
                         setIsConnected(false);
                    }
               } catch (error) {
                    log('Error setting up building presence:', error);
                    setIsConnected(false);
               }
          };

          setupPresence();

          return () => {
               isActive = false;
               unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
               if (normalizedBuildingIds.length) {
                    void unsubscribeFromBuildingPresence(normalizedBuildingIds);
               }
               setIsConnected(false);
          };
     }, [buildingKey, userId]);

     const updateUserPresence = React.useCallback(
          async (newUserInfo: Partial<PresenceUser>) => {
               if (normalizedBuildingIds.length > 0 && userId) {
                    await Promise.all(
                         normalizedBuildingIds.map((buildingId) =>
                              updatePresence(buildingId, { user_id: userId, ...newUserInfo })
                         )
                    );
               }
          },
          [normalizedBuildingIds, userId]
     );

     return {
          presenceUsers,
          isConnected,
          updateUserPresence,
          onlineUserIds: presenceUsers.map((user: PresenceUser) => user.user_id),
          onlineCount: presenceUsers.length,
     };
};
