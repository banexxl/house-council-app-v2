'use server';

import { useServerSideSupabaseAnonClient, useServerSideSupabaseServiceRoleClient } from 'src/libs/supabase/sb-server';
import { TABLES } from 'src/libs/supabase/tables';
import log from 'src/utils/logger';

import type {
     ChatRoom,
     ChatMessage,
     ChatRoomWithMembers,
     ChatMessageWithSender,
     SendMessagePayload,
     Message,
     Thread
} from 'src/types/chat';
import { Tenant, tenantKeyFields } from 'src/types/tenant';

type ActionResult<T> = {
     success: boolean;
     data?: T;
     error?: string;
};

/**
 * Get all chat rooms for the current user
 */
export const getUserChatRooms = async (): Promise<{
     success: boolean;
     data?: ChatRoomWithMembers[];
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();
     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Use service role client to bypass RLS for data fetching
          // First get rooms where user is a member
          const { data: userMemberships, error: membershipError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('room_id')
               .eq('user_id', user.id);
          if (membershipError) {
               log(`Error fetching user memberships: ${membershipError.message}`);
               return { success: false, error: membershipError.message };
          }

          if (!userMemberships || userMemberships.length === 0) {
               return { success: true, data: [] };
          }

          const roomIds = userMemberships.map(m => m.room_id);
          // First, let's see all rooms without the is_active filter
          const { data: allRooms } = await supabase
               .from(TABLES.CHAT_ROOMS)
               .select('id, name, is_active')
               .in('id', roomIds);
          // Get rooms
          const { data: rooms, error: roomsError } = await supabase
               .from(TABLES.CHAT_ROOMS)
               .select('*')
               .in('id', roomIds)
               .eq('is_active', true)
               .order('last_message_at', { ascending: false });
          if (roomsError) {
               log(`Error fetching chat rooms: ${roomsError.message}`);
               return { success: false, error: roomsError.message };
          }

          // Get all members for these rooms
          const { data: allMembers, error: allMembersError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('*')
               .in('room_id', roomIds);

          if (allMembersError) {
               log(`Error fetching room members: ${allMembersError.message}`);
               return { success: false, error: allMembersError.message };
          }

          // Get tenant/client info for each member
          const roomsWithMemberInfo = await Promise.all(
               (rooms || []).map(async (room: any) => {
                    // Get members for this specific room
                    const roomMembers = (allMembers || []).filter(m => m.room_id === room.id);

                    const membersWithInfo = await Promise.all(
                         roomMembers.map(async (member: any) => {
                              let userInfo: any = { id: member.user_id, email: member.user?.email };

                              // Get additional user info based on user type
                              if (member.user_type === 'tenant') {
                                   const { data: tenant } = await supabase
                                        .from(TABLES.TENANTS)
                                        .select('first_name, last_name')
                                        .eq('user_id', member.user_id)
                                        .single();

                                   if (tenant) {
                                        userInfo = { ...userInfo, first_name: tenant.first_name, last_name: tenant.last_name };
                                   }
                              } else if (member.user_type === 'client') {
                                   const { data: client } = await supabase
                                        .from(TABLES.CLIENTS)
                                        .select('company_name')
                                        .eq('id', member.user_id)
                                        .single();

                                   if (client) {
                                        userInfo = { ...userInfo, first_name: client.company_name, last_name: '' };
                                   }
                              }

                              return { ...member, user: userInfo };
                         })
                    );

                    return { ...room, members: membersWithInfo };
               })
          );

          return { success: true, data: roomsWithMemberInfo };
     } catch (e: any) {
          log(`Error in getUserChatRooms: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get messages for a specific chat room
 */
export const getRoomMessages = async (
     roomId: string,
     limit: number = 50,
     offset: number = 0
): Promise<{
     success: boolean;
     data?: ChatMessageWithSender[];
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Verify user is a member of this room using service role
          const { data: membership } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('id')
               .eq('room_id', roomId)
               .eq('user_id', user.id)
               .single();

          if (!membership) {
               return { success: false, error: 'Access denied to this room' };
          }

          // Get messages with sender info using service role
          const { data: messages, error: messagesError } = await supabase
               .from(TABLES.CHAT_MESSAGES)
               .select(`
        *,
        reply_to_message:${TABLES.CHAT_MESSAGES}!reply_to_message_id(
          id,
          message_text,
          sender_id,
          created_at
        )
      `)
               .eq('room_id', roomId)
               .is('deleted_at', null)
               .order('created_at', { ascending: false })
               .range(offset, offset + limit - 1);

          if (messagesError) {
               log(`Error fetching messages: ${messagesError.message}`);
               return { success: false, error: messagesError.message };
          }

          // Get sender info for each message
          const messagesWithSender = await Promise.all(
               (messages || []).map(async (message: any) => {
                    if (!message.sender_id) return message;

                    let sender: any = { id: message.sender_id, user_type: message.sender_type };

                    if (message.sender_type === 'tenant') {
                         const { data: tenant } = await supabase
                              .from(TABLES.TENANTS)
                              .select('first_name, last_name, email')
                              .eq('user_id', message.sender_id)
                              .single();

                         if (tenant) {
                              sender = { ...sender, ...tenant };
                         }
                    } else if (message.sender_type === 'client') {
                         const { data: client } = await supabase
                              .from(TABLES.CLIENTS)
                              .select('company_name, email')
                              .eq('id', message.sender_id)
                              .single();

                         if (client) {
                              sender = { ...sender, first_name: client.company_name, last_name: '', email: client.email };
                         }
                    }

                    return { ...message, sender };
               })
          );

          return { success: true, data: messagesWithSender.reverse() };
     } catch (e: any) {
          log(`Error in getRoomMessages: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Send a message to a chat room
 */
export const sendMessage = async (payload: SendMessagePayload): Promise<{
     success: boolean;
     data?: ChatMessage;
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Verify user is a member of this room using service role
          const { data: membership } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('user_type')
               .eq('room_id', payload.room_id)
               .eq('user_id', user.id)
               .single();

          if (!membership) {
               return { success: false, error: 'Access denied to this room' };
          }

          // Insert the message
          const { data: message, error: messageError } = await supabase
               .from(TABLES.CHAT_MESSAGES)
               .insert({
                    room_id: payload.room_id,
                    sender_id: user.id,
                    sender_type: membership.user_type, // This should already be the correct enum value from membership
                    message_text: payload.message_text,
                    message_type: payload.message_type || 'text',
                    reply_to_message_id: payload.reply_to_message_id,
                    file_url: payload.file_url,
                    file_name: payload.file_name,
                    file_size: payload.file_size,
                    created_at: new Date().toISOString() // Explicitly set timestamp
               })
               .select()
               .single();

          if (messageError) {
               console.error('Message insert error:', messageError);
               log(`Error sending message: ${messageError.message}`);
               return { success: false, error: messageError.message };
          }

          return { success: true, data: message };
     } catch (e: any) {
          log(`Error in sendMessage: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Create a direct message room between two users
 */
export const createDirectMessageRoom = async (
     otherUserId: string,
     buildingId?: string
): Promise<{
     success: boolean;
     data?: ChatRoom;
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();
     const serviceSupabase = await useServerSideSupabaseServiceRoleClient();

     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Determine current user type and building
          let currentUserType: 'tenant' | 'client' = 'tenant';
          let determinedBuildingId = buildingId;

          // Check if user is a tenant and get their building
          const { data: tenant } = await serviceSupabase
               .from(TABLES.TENANTS)
               .select(`
                    id,
                    apartment_id,
                    ${TABLES.APARTMENTS}!inner(building_id)
               `)
               .eq('user_id', user.id)
               .single();

          if (tenant) {
               currentUserType = 'tenant';
               if (!determinedBuildingId || determinedBuildingId === 'demo-building-id' || determinedBuildingId === '') {
                    determinedBuildingId = (tenant as any)[TABLES.APARTMENTS]?.building_id;
               }
          } else {
               // Check if user is a client
               const { data: client } = await serviceSupabase
                    .from(TABLES.CLIENTS)
                    .select(`
                         id,
                         ${TABLES.BUILDINGS}!inner(id)
                    `)
                    .eq('user_id', user.id)
                    .single();

               if (client) {
                    currentUserType = 'client';
                    if (!determinedBuildingId || determinedBuildingId === 'demo-building-id' || determinedBuildingId === '') {
                         // For clients, we'll use the first building they own
                         determinedBuildingId = (client as any)[TABLES.BUILDINGS]?.id;
                    }
               }
          }

          if (!determinedBuildingId) {
               return { success: false, error: 'Unable to determine building context for chat' };
          }

          // Get the other user's name for the room name
          let otherUserName = 'Unknown User';

          const { data: otherTenant } = await serviceSupabase
               .from(TABLES.TENANTS)
               .select('first_name, last_name')
               .eq('user_id', otherUserId)
               .single();

          if (otherTenant) {
               otherUserName = `${otherTenant.first_name} ${otherTenant.last_name}`.trim();
          }
          // Generate a room name for direct message
          const roomName = `DM: ${otherUserName}`;

          // Check if a direct message room already exists between these two users
          const { data: existingRooms } = await supabase
               .from(TABLES.CHAT_ROOMS)
               .select('id')
               .eq('room_type', 'direct')
               .eq('building_id', determinedBuildingId);

          // Find room where both users are members
          let existingRoom = null;
          if (existingRooms) {
               for (const room of existingRooms) {
                    const { data: members } = await supabase
                         .from(TABLES.CHAT_ROOM_MEMBERS)
                         .select('user_id')
                         .eq('room_id', room.id);

                    const memberIds = (members || []).map(m => m.user_id);
                    if (memberIds.includes(user.id) && memberIds.includes(otherUserId) && memberIds.length === 2) {
                         existingRoom = room;
                         break;
                    }
               }
          }

          if (existingRoom) {
               // Return existing room
               const { data: room } = await supabase
                    .from(TABLES.CHAT_ROOMS)
                    .select('*')
                    .eq('id', existingRoom.id)
                    .single();

               return { success: true, data: room };
          }

          // Create new direct message room
          const { data: newRoom, error: createError } = await supabase
               .from(TABLES.CHAT_ROOMS)
               .insert({
                    name: roomName,
                    description: '',
                    room_type: 'direct',
                    building_id: determinedBuildingId,
                    created_by: user.id,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString()
               })
               .select()
               .single();

          if (createError) {
               log(`Error creating direct message room: ${createError.message}`);
               return { success: false, error: createError.message };
          }

          // Add both users as members
          const { error: member1Error } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .insert({
                    room_id: newRoom.id,
                    user_id: user.id,
                    user_type: currentUserType,
                    chat_role: 'member',
                    joined_at: new Date().toISOString()
               });

          if (member1Error) {
               log(`Error adding user 1 to room: ${member1Error.message}`);
               return { success: false, error: member1Error.message };
          }

          const { error: member2Error } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .insert({
                    room_id: newRoom.id,
                    user_id: otherUserId,
                    chat_role: 'member',
                    joined_at: new Date().toISOString()
               });

          if (member2Error) {
               log(`Error adding user 2 to room: ${member2Error.message}`);
               return { success: false, error: member2Error.message };
          }

          return { success: true, data: newRoom };
     } catch (e: any) {
          log(`Error in createDirectMessageRoom: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Create a building-wide group chat
 */
export const createBuildingGroupChat = async (
     buildingId: string,
     name: string,
     description?: string
): Promise<{
     success: boolean;
     data?: ChatRoom;
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Determine current user type
          let currentUserType: 'tenant' | 'client' = 'tenant';
          const { data: tenant } = await supabase
               .from(TABLES.TENANTS)
               .select('id')
               .eq('user_id', user.id)
               .single();

          if (!tenant) {
               currentUserType = 'client';
          }

          // Create building group chat directly
          const { data: newRoom, error: createError } = await supabase
               .from(TABLES.CHAT_ROOMS)
               .insert({
                    name: name,
                    description: description || '',
                    room_type: 'group',
                    building_id: buildingId,
                    created_by: user.id,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString()
               })
               .select()
               .single();

          if (createError) {
               log(`Error creating building group chat: ${createError.message}`);
               return { success: false, error: createError.message };
          }

          // Add creator as admin member
          const { error: memberError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .insert({
                    room_id: newRoom.id,
                    user_id: user.id,
                    user_type: currentUserType,
                    chat_role: 'admin',
                    joined_at: new Date().toISOString()
               });

          if (memberError) {
               log(`Error adding creator to room: ${memberError.message}`);
               return { success: false, error: memberError.message };
          }

          // TODO: Optionally add all building members to the group
          // This could be implemented if needed

          return { success: true, data: newRoom };
     } catch (e: any) {
          log(`Error in createBuildingGroupChat: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
     roomId: string,
     messageIds: string[]
): Promise<{
     success: boolean;
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
               return { success: false, error: 'User not authenticated' };
          }

          // Insert read receipts (ignoring conflicts)
          const readReceipts = messageIds.map(messageId => ({
               message_id: messageId,
               user_id: user.id
          }));

          const { error: readError } = await supabase
               .from(TABLES.CHAT_MESSAGE_READS)
               .upsert(readReceipts, { onConflict: 'message_id,user_id' });

          if (readError) {
               log(`Error marking messages as read: ${readError.message}`);
               return { success: false, error: readError.message };
          }

          // Update the user's last_read_at in room membership
          const { error: updateError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .update({ last_read_at: new Date().toISOString() })
               .eq('room_id', roomId)
               .eq('user_id', user.id);

          if (updateError) {
               log(`Error updating last read time: ${updateError.message}`);
          }

          return { success: true };
     } catch (e: any) {
          log(`Error in markMessagesAsRead: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Mark room as read for a user (simpler version)
 */
export const markRoomAsRead = async (
     roomId: string,
     userId: string
): Promise<{
     success: boolean;
     error?: string;
}> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          // Update the user's last_read_at in room membership
          const { error: updateError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .update({ last_read_at: new Date().toISOString() })
               .eq('room_id', roomId)
               .eq('user_id', userId);

          if (updateError) {
               log(`Error updating last read time: ${updateError.message}`);
               return { success: false, error: updateError.message };
          }

          return { success: true };
     } catch (e: any) {
          log(`Error in markRoomAsRead: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (userId: string): Promise<ActionResult<number>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          // Get all rooms the user is a member of
          const { data: memberRooms, error: roomsError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('room_id')
               .eq('user_id', userId);

          if (roomsError) {
               log(`Error fetching user rooms: ${roomsError.message}`);
               return { success: false, error: roomsError.message };
          }

          let totalUnread = 0;

          for (const memberRoom of memberRooms || []) {
               const { data: lastRead } = await supabase
                    .from(TABLES.CHAT_MESSAGE_READS)
                    .select('read_at')
                    .eq('room_id', memberRoom.room_id)
                    .eq('user_id', userId)
                    .single();

               const { count } = await supabase
                    .from(TABLES.CHAT_MESSAGES)
                    .select('*', { count: 'exact', head: true })
                    .eq('room_id', memberRoom.room_id)
                    .neq('sender_id', userId) // Don't count own messages
                    .gt('created_at', lastRead?.read_at || '1970-01-01');

               totalUnread += count || 0;
          }

          return { success: true, data: totalUnread };
     } catch (e: any) {
          log(`Error in getUnreadMessageCount: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Leave a chat room
 */
export const leaveChatRoom = async (roomId: string, userId: string): Promise<ActionResult<null>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { error } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .delete()
               .eq('room_id', roomId)
               .eq('user_id', userId);

          if (error) {
               log(`Error leaving chat room: ${error.message}`);
               return { success: false, error: error.message };
          }

          return { success: true, data: null };
     } catch (e: any) {
          log(`Error in leaveChatRoom: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Add member to chat room (for group chats)
 */
export const addMemberToChatRoom = async (
     roomId: string,
     userId: string,
     userType: 'tenant' | 'client'
): Promise<ActionResult<null>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { error } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .insert({
                    room_id: roomId,
                    user_id: userId,
                    user_type: userType,
                    joined_at: new Date().toISOString()
               });

          if (error) {
               log(`Error adding member to chat room: ${error.message}`);
               return { success: false, error: error.message };
          }

          return { success: true, data: null };
     } catch (e: any) {
          log(`Error in addMemberToChatRoom: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get contacts (users) in the same building for chat
 */
export const getContacts = async (query?: string): Promise<ActionResult<Tenant[]>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
               return { success: false, error: 'Not authenticated' };
          }

          // Get the current user's building
          const { data: currentUserData, error: userError } = await supabase
               .from(TABLES.TENANTS)
               .select('building_id')
               .eq('user_id', currentUser.id)
               .single();

          let buildingId: string;

          if (userError || !currentUserData?.building_id) {
               // Try clients table if not found in tenants
               const { data: clientData, error: clientError } = await supabase
                    .from(TABLES.CLIENTS)
                    .select('building_id')
                    .eq('user_id', currentUser.id)
                    .single();

               if (clientError || !clientData?.building_id) {
                    return { success: false, error: 'User not found or no building assigned' };
               }
               buildingId = clientData.building_id;
          } else {
               buildingId = currentUserData.building_id;
          }

          const allTenantKeys = tenantKeyFields.join(',');

          // Get all users in the same building (both tenants and clients)
          let tenantQuery = supabase
               .from(TABLES.TENANTS)
               .select(`
                    id,
                    user_id,
                    first_name,
                    last_name,
                    email,
                    phone_number,
                    date_of_birth,
                    apartment_id,
                    apartments!inner(apartment_number, buildings!inner(street_address, city)),
                    avatar_url,
                    is_primary,
                    move_in_date,
                    tenant_type,
                    notes,
                    created_at,
                    updated_at,
                    email_opt_in,
                    sms_opt_in,
                    viber_opt_in,
                    whatsapp_opt_in
               `)
               .eq('building_id', buildingId)
               .neq('user_id', currentUser.id); // Exclude current user

          // let clientQuery = supabase
          //      .from(TABLES.CLIENTS)
          //      .select('user_id, first_name, last_name, email, avatar, company_name, user_type')
          //      .eq('building_id', buildingId)
          //      .neq('user_id', currentUser.id); // Exclude current user

          if (query) {
               const searchTerm = `%${query.toLowerCase()}%`;
               tenantQuery = tenantQuery.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
               // clientQuery = clientQuery.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`);
          }

          const [{ data: tenants, error: tenantsError }] = await Promise.all([
               tenantQuery,
          ]);

          if (tenantsError) {
               log(`Error fetching tenants: ${tenantsError.message}`);
               return { success: false, error: tenantsError.message };
          }

          // Transform the raw database data to match Tenant interface
          const transformedTenants: Tenant[] = (tenants || []).map((tenant: any) => ({
               id: tenant.id || '',
               first_name: tenant.first_name || '',
               last_name: tenant.last_name || '',
               email: tenant.email,
               phone_number: tenant.phone_number || '',
               date_of_birth: tenant.date_of_birth || '',
               apartment_id: tenant.apartment_id || '',
               apartment: {
                    apartment_number: tenant.apartments?.[0]?.apartment_number || '',
                    building: {
                         id: tenant.apartments?.[0]?.buildings?.[0]?.id || '',
                         street_address: tenant.apartments?.[0]?.buildings?.[0]?.street_address || '',
                         city: tenant.apartments?.[0]?.buildings?.[0]?.city || ''
                    }
               },
               avatar_url: tenant.avatar_url,
               is_primary: tenant.is_primary || false,
               move_in_date: tenant.move_in_date || '',
               tenant_type: tenant.tenant_type || 'owner',
               notes: tenant.notes,
               created_at: tenant.created_at,
               updated_at: tenant.updated_at,
               user_id: tenant.user_id,
               email_opt_in: tenant.email_opt_in || false,
               sms_opt_in: tenant.sms_opt_in || false,
               viber_opt_in: tenant.viber_opt_in || false,
               whatsapp_opt_in: tenant.whatsapp_opt_in || false,
               // Chat-related properties with defaults
               last_activity: tenant.last_activity,
               is_online: tenant.is_online || false,
               role: tenant.role || 'member',
               joined_at: tenant.joined_at,
               last_read_at: tenant.last_read_at,
               is_muted: tenant.is_muted || false
          }));

          return { success: true, data: transformedTenants };
     } catch (e: any) {
          log(`Error in getTenants: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get threads (chat rooms) for the current user
 */
export const getThreads = async (): Promise<ActionResult<Thread[]>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
               return { success: false, error: 'Not authenticated' };
          }

          // First get room IDs where the current user is a member
          const { data: userRooms, error: roomsError } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('room_id')
               .eq('user_id', currentUser.id);

          if (roomsError) {
               log(`Error fetching user rooms: ${roomsError.message}`);
               return { success: false, error: 'Failed to fetch user rooms' };
          }

          if (!userRooms || userRooms.length === 0) {
               return { success: true, data: [] };
          }

          const roomIds = userRooms.map(ur => ur.room_id);

          // Get room details for those IDs
          const { data: rooms, error } = await supabase
               .from(TABLES.CHAT_ROOMS)
               .select(`
                    id,
                    name,
                    description,
                    room_type,
                    created_at,
                    updated_at,
                    last_message_at,
                    building_id,
                    created_by,
                    is_active
               `)
               .in('id', roomIds)
               .order('last_message_at', { ascending: false });
          if (error) {
               log(`Error fetching chat rooms: ${error.message}`);
               return { success: false, error: 'Failed to fetch chat rooms' };
          }

          const threads: Thread[] = [];

          for (const room of rooms || []) {
               // Get the latest message for this room
               const { data: latestMessage } = await supabase
                    .from(TABLES.CHAT_MESSAGES)
                    .select('id, message_text, created_at, sender_id')
                    .eq('room_id', room.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

               // Get participant IDs
               const { data: members } = await supabase
                    .from(TABLES.CHAT_ROOM_MEMBERS)
                    .select('user_id')
                    .eq('room_id', room.id);

               const participantIds = (members || []).map(member => member.user_id);

               threads.push({
                    id: room.id,
                    messages: [], // Messages will be loaded separately when viewing the thread
                    participantIds,
                    type: room.room_type === 'direct' ? 'ONE_TO_ONE' : 'GROUP',
                    unreadCount: 0, // This could be implemented with message read tracking
               });
          }

          return { success: true, data: threads };
     } catch (e: any) {
          log(`Error in getThreads: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get a specific thread (chat room) with messages
 */
export const getThread = async (threadKey: string): Promise<ActionResult<Thread | undefined>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
               return { success: false, error: 'Not authenticated' };
          }

          // Check if threadKey is a room ID (UUID format)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (uuidRegex.test(threadKey)) {
               // Get the room details
               const { data: room, error: roomError } = await supabase
                    .from(TABLES.CHAT_ROOMS)
                    .select('*')
                    .eq('id', threadKey)
                    .single();

               if (roomError || !room) {
                    return { success: false, error: 'Room not found' };
               }

               // Verify user is a member of this room
               const { data: membership } = await supabase
                    .from(TABLES.CHAT_ROOM_MEMBERS)
                    .select('user_id')
                    .eq('room_id', threadKey)
                    .eq('user_id', currentUser.id)
                    .single();

               if (!membership) {
                    return { success: false, error: 'Access denied to this room' };
               }

               // Get messages for this room
               const { data: messages, error: messagesError } = await supabase
                    .from(TABLES.CHAT_MESSAGES)
                    .select('*')
                    .eq('room_id', threadKey)
                    .order('created_at', { ascending: true });

               if (messagesError) {
                    log(`Error fetching messages: ${messagesError.message}`);
                    return { success: false, error: 'Failed to fetch messages' };
               }

               // Get participant IDs
               const { data: members } = await supabase
                    .from(TABLES.CHAT_ROOM_MEMBERS)
                    .select('user_id')
                    .eq('room_id', threadKey);

               const participantIds = (members || []).map(member => member.user_id);

               // Convert Supabase messages to the expected format
               const formattedMessages: Message[] = (messages || []).map(msg => ({
                    id: msg.id,
                    attachments: msg.attachments || [],
                    body: msg.message_text,
                    contentType: 'text',
                    created_at: new Date(msg.created_at).getTime(),
                    authorId: msg.sender_id,
               }));

               const thread: Thread = {
                    id: room.id,
                    messages: formattedMessages,
                    participantIds,
                    type: room.room_type === 'direct' ? 'ONE_TO_ONE' : 'GROUP',
                    unreadCount: 0, // This could be implemented with message read tracking
               };

               return { success: true, data: thread };
          } else {
               // Handle non-UUID thread keys (legacy support)
               return { success: false, error: 'Legacy thread keys not supported' };
          }
     } catch (e: any) {
          log(`Error in getThread: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Mark thread as seen (mark messages as read)
 */
export const markThreadAsSeen = async (threadId: string): Promise<ActionResult<boolean>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
               return { success: false, error: 'Not authenticated' };
          }

          // Get all messages in this room that the user hasn't read
          const { data: unreadMessages } = await supabase
               .from(TABLES.CHAT_MESSAGES)
               .select('id')
               .eq('room_id', threadId)
               .neq('sender_id', currentUser.id); // Don't include own messages

          if (!unreadMessages || unreadMessages.length === 0) {
               return { success: true, data: true }; // No messages to mark as read
          }

          // Check which messages are already marked as read
          const { data: existingReads } = await supabase
               .from(TABLES.CHAT_MESSAGE_READS)
               .select('message_id')
               .eq('user_id', currentUser.id)
               .in('message_id', unreadMessages.map(msg => msg.id));

          const alreadyReadMessageIds = new Set(existingReads?.map(read => read.message_id) || []);

          // Filter out messages that are already marked as read
          const messagesToMarkAsRead = unreadMessages.filter(msg => !alreadyReadMessageIds.has(msg.id));

          if (messagesToMarkAsRead.length === 0) {
               return { success: true, data: true }; // All messages already marked as read
          }

          // Mark remaining messages as read
          const readRecords = messagesToMarkAsRead.map(msg => ({
               message_id: msg.id,
               user_id: currentUser.id,
               read_at: new Date().toISOString(),
          }));

          const { error } = await supabase
               .from(TABLES.CHAT_MESSAGE_READS)
               .insert(readRecords);

          if (error) {
               log(`Error marking thread as seen: ${error.message}`);
               return { success: false, error: 'Failed to mark thread as seen' };
          }

          return { success: true, data: true };
     } catch (e: any) {
          log(`Error in markThreadAsSeen: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get participants for a thread (chat room)
 */
export const getParticipants = async (threadKey: string): Promise<ActionResult<Tenant[]>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
               return { success: false, error: 'Not authenticated' };
          }

          // Check if threadKey is a room ID (UUID format)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (uuidRegex.test(threadKey)) {
               // This is a room ID, fetch participants from chat room members
               const { data: members, error } = await supabase
                    .from(TABLES.CHAT_ROOM_MEMBERS)
                    .select(`
                         user_id,
                         chat_role,
                         joined_at
                    `)
                    .eq('room_id', threadKey);

               if (error) {
                    log(`Error fetching room members: ${error.message}`);
                    return { success: false, error: 'Failed to fetch room participants' };
               }

               const participants: Tenant[] = [];

               // For each member, fetch their details from the appropriate table
               for (const member of members || []) {
                    // Try to fetch from tenants table first
                    const { data: tenantData } = await supabase
                         .from(TABLES.TENANTS)
                         .select('user_id, first_name, last_name, email, avatar_url, apartment_number')
                         .eq('user_id', member.user_id)
                         .single();

                    if (tenantData) {
                         participants.push({
                              id: tenantData.user_id,
                              first_name: tenantData.first_name || '',
                              last_name: tenantData.last_name || '',
                              email: tenantData.email,
                              avatar_url: tenantData.avatar_url || '',
                              is_online: false,
                              last_activity: new Date(member.joined_at).toISOString(),
                              // Required tenant fields with defaults
                              apartment_id: '',
                              apartment: { apartment_number: tenantData.apartment_number || '', building: { id: '', street_address: '', city: '' } },
                              is_primary: false,
                              move_in_date: '',
                              tenant_type: 'owner' as const,
                              email_opt_in: false,
                              sms_opt_in: false,
                              viber_opt_in: false,
                              whatsapp_opt_in: false,
                         });
                    } else {
                         // Try to fetch from clients table
                         const { data: clientData } = await supabase
                              .from(TABLES.CLIENTS)
                              .select('user_id, contact_person, email, avatar, name')
                              .eq('user_id', member.user_id)
                              .single();

                         if (clientData) {
                              participants.push({
                                   id: clientData.user_id,
                                   first_name: clientData.contact_person || '',
                                   last_name: '',
                                   email: clientData.email,
                                   avatar_url: clientData.avatar || '',
                                   is_online: false,
                                   last_activity: new Date(member.joined_at).toISOString(),
                                   // Required tenant fields with defaults
                                   apartment_id: '',
                                   apartment: { apartment_number: '', building: { id: '', street_address: '', city: '' } },
                                   is_primary: false,
                                   move_in_date: '',
                                   tenant_type: 'owner' as const,
                                   email_opt_in: false,
                                   sms_opt_in: false,
                                   viber_opt_in: false,
                                   whatsapp_opt_in: false,
                              });
                         }
                    }
               }

               return { success: true, data: participants };
          } else {
               // Handle non-UUID thread keys (legacy support)
               return { success: false, error: 'Legacy thread keys not supported' };
          }
     } catch (e: any) {
          log(`Error in getParticipants: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Add a message to a thread (chat room)
 */
export const addMessage = async (params: {
     threadId?: string;
     recipientIds?: string[];
     body: string;
}): Promise<ActionResult<{ message: Message; threadId: string }>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) {
               return { success: false, error: 'Not authenticated' };
          }

          let roomId = params.threadId;

          // If no threadId provided, create a new room with recipientIds
          if (!roomId && params.recipientIds && params.recipientIds.length > 0) {
               // This would create a new chat room - implement if needed
               return { success: false, error: 'Creating new rooms via addMessage not implemented yet' };
          }

          if (!roomId) {
               return { success: false, error: 'No thread ID or recipient IDs provided' };
          }

          // Verify user is a member of this room
          const { data: membership } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('user_type')
               .eq('room_id', roomId)
               .eq('user_id', currentUser.id)
               .single();

          if (!membership) {
               return { success: false, error: 'Access denied to this room' };
          }

          // Create the message
          const messageData = {
               room_id: roomId,
               sender_id: currentUser.id,
               sender_type: membership.user_type,
               message_text: params.body,
               message_type: 'text',
               created_at: new Date().toISOString()
          };

          const { data: newMessage, error } = await supabase
               .from(TABLES.CHAT_MESSAGES)
               .insert(messageData)
               .select()
               .single();

          if (error) {
               log(`Error sending message: ${error.message}`);
               return { success: false, error: error.message };
          }

          // Update room's last_message_at
          // Note: Temporarily commented out to test if this is causing the case sensitivity issue
          // await supabase
          //      .from(TABLES.CHAT_ROOMS)
          //      .update({ last_message_at: new Date().toISOString() })
          //      .eq('id', roomId);

          // Format the message to match the expected interface
          const formattedMessage: Message = {
               id: newMessage.id,
               attachments: newMessage.attachments || [],
               body: newMessage.message_text,
               contentType: 'text',
               created_at: new Date(newMessage.created_at).getTime(),
               authorId: newMessage.sender_id,
          };

          return {
               success: true,
               data: {
                    message: formattedMessage,
                    threadId: roomId,
               }
          };
     } catch (e: any) {
          log(`Error in addMessage: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};

/**
 * Get unread message count for a specific room and user
 */
export const getRoomUnreadCount = async (roomId: string, userId: string): Promise<ActionResult<number>> => {
     const supabase = await useServerSideSupabaseAnonClient();

     try {
          // Get the user's last read time for this room
          const { data: membership } = await supabase
               .from(TABLES.CHAT_ROOM_MEMBERS)
               .select('last_read_at')
               .eq('room_id', roomId)
               .eq('user_id', userId)
               .single();

          const lastReadAt = membership?.last_read_at || '1970-01-01';

          // Count unread messages (messages created after last read time, excluding own messages)
          const { count, error } = await supabase
               .from(TABLES.CHAT_MESSAGES)
               .select('*', { count: 'exact', head: true })
               .eq('room_id', roomId)
               .neq('sender_id', userId) // Don't count own messages
               .gt('created_at', lastReadAt);

          if (error) {
               log(`Error counting unread messages: ${error.message}`);
               return { success: false, error: error.message };
          }

          return { success: true, data: count || 0 };
     } catch (e: any) {
          log(`Error in getRoomUnreadCount: ${e.message}`);
          return { success: false, error: e.message || 'Unexpected error' };
     }
};