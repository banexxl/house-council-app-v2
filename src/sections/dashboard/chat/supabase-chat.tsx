'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Drawer, useMediaQuery, Theme, Menu, MenuItem, ListItemIcon, ListItemText, SvgIcon, Button, IconButton } from '@mui/material';
import PersonIcon from '@untitled-ui/icons-react/build/esm/User01';
import GroupIcon from '@untitled-ui/icons-react/build/esm/Users01';
import MenuIcon from '@untitled-ui/icons-react/build/esm/Menu01';
import { useChatRooms, useChatMessages, useTypingIndicators } from 'src/hooks/use-chat';
import { sendMessage, createBuildingGroupChat, createDirectMessageRoom } from 'src/app/actions/chat/chat-actions';
import { useAuth } from 'src/contexts/auth/auth-provider';
import { UserSelectionDialog } from 'src/components/chat/UserSelectionDialog';
import type { ChatRoomWithMembers, ChatMessageWithSender, SendMessagePayload } from 'src/types/chat';
import type { BuildingUser } from 'src/app/actions/tenant/tenant-actions';
import type { Tenant } from 'src/types/tenant';

import { ChatContainer } from './chat-container';
import { ChatSidebar } from './chat-sidebar';
import { ChatThread } from './chat-thread';
import { ChatBlank } from './chat-blank';

interface SupabaseChatProps {
     buildingId?: string;
}

// Adapter function to convert our Supabase chat rooms to the format expected by existing components
const adaptChatRoomsToThreads = (rooms: ChatRoomWithMembers[], currentUserId?: string) => {
     const byId: Record<string, any> = {};
     const allIds: string[] = [];

     rooms.forEach(room => {
          const threadId = room.id;
          allIds.push(threadId);

          // Convert room to thread format
          byId[threadId] = {
               id: threadId,
               type: room.room_type === 'group' ? 'GROUP' : 'ONE_TO_ONE',
               participantIds: room.members?.map(m => m.user_id) || [],
               participants: room.members || [],
               messages: [],
               unreadCount: 0, // This would be calculated based on read receipts
               lastMessage: room.last_message ? {
                    id: 'last',
                    body: room.last_message.message_text,
                    created_at: room.last_message.created_at,
                    authorId: room.last_message.sender_id
               } : null,
               // Additional fields for compatibility
               name: room.name,
               room_type: room.room_type,
               created_by: room.created_by,
               building_id: room.building_id,
               last_message_at: room.last_message_at
          };
     });

     return { byId, allIds };
};

// Adapter function to convert our Supabase messages to the format expected by existing components
const adaptMessagesToOldFormat = (messages: ChatMessageWithSender[]) => {
     return messages.map(msg => ({
          id: msg.id,
          authorId: msg.sender_id || '', // Ensure authorId is never undefined
          body: msg.message_text,
          contentType: msg.message_type,
          created_at: new Date(msg.created_at).getTime(), // Convert to timestamp
          threadId: msg.room_id,
          attachments: msg.file_url ? [{ id: msg.id + '_file', url: msg.file_url }] : [], // Convert file to attachment format
          // Additional fields for compatibility
          sender: msg.sender,
          reply_to_message_id: msg.reply_to_message_id,
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_size: msg.file_size
     }));
};

// Adapter function to convert room members to participants format
const adaptMembersToParticipants = (members: any[]): Tenant[] => {
     return members.map(member => ({
          id: member.user_id,
          first_name: member.user?.first_name || '',
          last_name: member.user?.last_name || '',
          email: member.user?.email || '',
          name: member.user ? `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() || member.user.email : 'Unknown User',
          avatar: '', // We don't have avatar URLs in our current system
          user_type: member.user_type,
          isActive: false, // This would be determined by presence system
          is_online: false,
          // Required tenant fields with defaults
          apartment_id: '',
          apartment: { apartment_number: '', building: { street_address: '', city: '' } },
          is_primary: false,
          move_in_date: '',
          tenant_type: 'owner' as const,
          email_opt_in: false,
          sms_opt_in: false,
          viber_opt_in: false,
          whatsapp_opt_in: false,
     }));
};

export const SupabaseChat: React.FC<SupabaseChatProps> = ({ buildingId }) => {
     const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

     const [sidebarOpen, setSidebarOpen] = useState(mdUp); // Start open on desktop, closed on mobile
     const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
     const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithMembers | null>(null);
     const [userSelectionOpen, setUserSelectionOpen] = useState(false);
     const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);
     const [groupCreationMode, setGroupCreationMode] = useState(false);
     const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
     const [newGroupName, setNewGroupName] = useState('');
     const auth = useAuth();
     const currentUser = auth.userData;

     // Use our Supabase hooks
     const { rooms, loading: roomsLoading, error: roomsError, refreshRooms } = useChatRooms();
     const {
          messages,
          loading: messagesLoading,
          sendMessage: sendMessageHook,
          loadMoreMessages,
          hasMore,
          refreshMessages
     } = useChatMessages(currentThreadId);
     const { typingUsers, setIsTyping } = useTypingIndicators(currentThreadId);

     // Debug logging for messages
     useEffect(() => {
          if (currentThreadId) {
               // Messages debug logging removed for production
          }
     }, [currentThreadId, messages, messagesLoading]);

     // Debug logging for rooms
     useEffect(() => {
          // Rooms debug logging removed for production  
     }, [rooms]);

     // Handle creating new chat options
     const handleCreateMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
          setCreateMenuAnchor(event.currentTarget);
     }, []);

     // Handle create room - adapter for ChatSidebar
     const handleCreateRoom = useCallback(() => {
          // For now, we'll just show the create menu
          // In a real implementation, this might open a different dialog
     }, []);

     const handleCreateMenuClose = useCallback(() => {
          setCreateMenuAnchor(null);
     }, []);

     const handleStartDirectMessage = useCallback((user: Tenant) => {
          handleSelectUser(user);
     }, []);

     // Handle direct message creation
     const handleSelectUser = useCallback(async (user: Tenant) => {
          try {
               // If no buildingId provided, try to get one from the current user
               let effectiveBuildingId = buildingId;
               if (!effectiveBuildingId) {
                    effectiveBuildingId = '';
               }

               const result = await createDirectMessageRoom(
                    user.id,
                    user.user_type || 'tenant',
                    buildingId || undefined // Pass undefined instead of empty string
               );

               if (result.success && result.data) {
                    const room = result.data as any;
                    setSelectedRoom(room);
                    setCurrentThreadId(room.id);

                    // Refresh rooms to get the latest data
                    await refreshRooms();

                    // Close mobile sidebar
                    if (!mdUp) {
                         setSidebarOpen(false);
                    }
               } else {
                    console.error('Failed to create direct message room:', result.error);
                    // Show user-friendly error message
                    alert(`Unable to start chat: ${result.error || 'Please try again'}`);
               }
          } catch (error) {
               console.error('Error creating direct message:', error);
               alert(`Error starting chat: ${error}`);
          }

          // Reset dialog state
          setUserSelectionOpen(false);
          setGroupCreationMode(false);
          setSelectedGroupMembers([]);
          setNewGroupName('');
     }, [buildingId, refreshRooms, mdUp, auth.userData?.id]);     // Handle group creation with selected users
     const handleCreateGroupWithUsers = useCallback(async () => {
          if (!buildingId || selectedGroupMembers.length === 0) {
               return;
          }

          const groupName = newGroupName || `Group Chat (${selectedGroupMembers.length + 1} members)`;

          try {
               const result = await createBuildingGroupChat(
                    buildingId,
                    groupName
               );

               if (result.success && result.data) {
                    const room = result.data as any;
                    setSelectedRoom(room);
                    setCurrentThreadId(room.id);
                    refreshRooms();

                    // Reset state
                    setUserSelectionOpen(false);
                    setGroupCreationMode(false);
                    setSelectedGroupMembers([]);
                    setNewGroupName('');
               }
          } catch (error) {
               console.error('Error creating group:', error);
          }
     }, [newGroupName, buildingId, selectedGroupMembers, refreshRooms]);

     const handleUserSelectionClose = useCallback(() => {
          if (groupCreationMode && selectedGroupMembers.length > 0) {
               // If in group mode and users are selected, ask for group name
               const groupName = prompt('Enter a name for the group:');
               if (groupName && groupName.trim()) {
                    setNewGroupName(groupName.trim());
                    handleCreateGroupWithUsers();
               }
          }
          setUserSelectionOpen(false);
          setGroupCreationMode(false);
          setSelectedGroupMembers([]);
          setNewGroupName('');
     }, [groupCreationMode, selectedGroupMembers, handleCreateGroupWithUsers]);

     // Handle thread selection for compatibility with existing components  
     const handleThreadSelect = useCallback((threadId: string) => {
          setCurrentThreadId(threadId);
          const room = rooms.find(r => r.id === threadId);
          if (room) {
               setSelectedRoom(room);
          }
     }, [rooms]);

     // Handle direct message creation
     const handleDirectMessage = useCallback(() => {
          setCreateMenuAnchor(null);
          setGroupCreationMode(false);
          setUserSelectionOpen(true);
     }, []);

     // Handle search selection - create direct message with selected user
     const handleSearchSelection = useCallback(async (contact: Tenant) => {
          try {
               // Create BuildingUser from the contact data
               const user: Tenant = {
                    id: contact.id,
                    email: contact.email,
                    first_name: contact.first_name,
                    last_name: contact.last_name,
                    user_type: contact.user_type || 'tenant',
                    avatar: contact.avatar,
                    apartment_number: contact.apartment_number,
                    is_online: contact.is_online,
                    apartment_id: contact.apartment_id || '',
                    apartment: {
                         apartment_number: contact.apartment_number || '',
                         building: {
                              street_address: contact.apartment.building.street_address || '',
                              city: contact.apartment.building.city || ''
                         }
                    },
                    is_primary: contact.is_primary || false,
                    tenant_type: contact.tenant_type,
                    email_opt_in: contact.email_opt_in || false,
                    sms_opt_in: contact.sms_opt_in || false,
                    viber_opt_in: contact.viber_opt_in || false,
                    whatsapp_opt_in: contact.whatsapp_opt_in || false,
                    move_in_date: contact.move_in_date || ''
               };

               await handleSelectUser(user);
          } catch (error) {
               console.error('Error handling search selection:', error);
          }
     }, [handleSelectUser]);     // Handle group creation menu option
     const handleCreateGroup = useCallback(() => {
          setCreateMenuAnchor(null);
          setGroupCreationMode(true);
          setUserSelectionOpen(true);
     }, []);



     // Handle sending messages with our new system
     const handleSendMessage = useCallback(async (messageBody: string): Promise<void> => {
          if (!currentThreadId || !selectedRoom) return;

          try {
               const payload: SendMessagePayload = {
                    room_id: currentThreadId,
                    message_text: messageBody,
                    message_type: 'text'
               };

               const result = await sendMessage(payload);
               if (!result.success) {
                    console.error('Failed to send message:', result.error);
               }
               // Message will appear via real-time subscription regardless of success
          } catch (error) {
               console.error('Error sending message:', error);
          }
     }, [currentThreadId, selectedRoom]);

     // Handle responsive sidebar behavior
     useEffect(() => {
          // On screen size change, set appropriate default state
          setSidebarOpen(mdUp);
     }, [mdUp]);

     // Close sidebar on mobile when thread is selected
     useEffect(() => {
          if (currentThreadId && !mdUp) {
               setSidebarOpen(false);
          }
     }, [currentThreadId, mdUp]);

     // Adapt our data to the format expected by existing components
     const adaptedThreads = adaptChatRoomsToThreads(rooms, currentUser?.id);
     const adaptedMessages = adaptMessagesToOldFormat(messages);
     const adaptedParticipants = selectedRoom ? adaptMembersToParticipants(selectedRoom.members || []) : [];

     // Convert current user to the format expected by ChatMessages
     const adaptedCurrentUser = currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          name: (() => {
               if (auth.tenant) return `${auth.tenant.first_name} ${auth.tenant.last_name}`.trim();
               if (auth.client) return auth.client.name;
               if (auth.admin) return `${auth.admin.first_name || ''} ${auth.admin.last_name || ''}`.trim() || auth.admin.email;
               return currentUser.email?.split('@')[0] || 'User';
          })(),
          avatar: (() => {
               if (auth.client?.avatar) return auth.client.avatar;
               return '/assets/avatars/avatar-default.png';
          })()
     } : undefined;

     // Handle sidebar toggle
     const handleSidebarToggle = useCallback(() => {
          setSidebarOpen(prev => !prev);
     }, []);

     // Mock thread key for compatibility with existing components
     const threadKey = currentThreadId || '';

     return (
          <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
               {/* Sidebar */}
               <Drawer
                    anchor="left"
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    variant={mdUp ? 'persistent' : 'temporary'}
                    sx={{
                         width: mdUp ? 380 : '100%',
                         flexShrink: 0,
                         '& .MuiDrawer-paper': {
                              position: mdUp ? 'relative' : 'fixed',
                              width: mdUp ? 380 : '80%',
                              maxWidth: mdUp ? 380 : '320px'
                         }
                    }}
               >
                    <ChatSidebar
                         rooms={rooms}
                         selectedRoom={selectedRoom}
                         onRoomSelect={(room) => {
                              setSelectedRoom(room);
                              setCurrentThreadId(room.id);
                              if (!mdUp) {
                                   setSidebarOpen(false);
                              }
                         }}
                         onCreateRoom={handleCreateRoom}
                         onSearchSelect={handleSearchSelection}
                         loading={roomsLoading}
                         // Props for compatibility with existing sidebar
                         onClose={() => setSidebarOpen(false)}
                         open={sidebarOpen}
                         // Adapted data
                         threads={adaptedThreads}
                         currentThreadId={currentThreadId}
                         onThreadSelect={handleThreadSelect}
                    />
               </Drawer>

               {/* Main chat area */}
               <ChatContainer open={sidebarOpen}>
                    {/* Mobile header with hamburger menu - always present on mobile */}
                    {!mdUp && (
                         <Box
                              sx={{
                                   display: 'flex',
                                   alignItems: 'center',
                                   p: 2,
                                   borderBottom: 1,
                                   borderColor: 'divider',
                                   bgcolor: 'background.paper'
                              }}
                         >
                              <IconButton
                                   onClick={handleSidebarToggle}
                                   edge="start"
                                   sx={{ mr: 1 }}
                              >
                                   <SvgIcon>
                                        <MenuIcon />
                                   </SvgIcon>
                              </IconButton>
                              <Box sx={{ fontWeight: 'medium' }}>
                                   {selectedRoom ? selectedRoom.name : 'Chat'}
                              </Box>
                         </Box>
                    )}

                    {currentThreadId && selectedRoom ? (
                         <ChatThread
                              threadKey={threadKey}
                              messages={adaptedMessages}
                              participants={adaptedParticipants}
                              currentUser={adaptedCurrentUser}
                              onSendMessage={handleSendMessage}
                              typingUsers={typingUsers}
                              onTyping={setIsTyping}
                         />
                    ) : (
                         <ChatBlank />
                    )}
               </ChatContainer>

               {/* Create Menu */}
               <Menu
                    anchorEl={createMenuAnchor}
                    open={Boolean(createMenuAnchor)}
                    onClose={handleCreateMenuClose}
               >
                    <MenuItem onClick={handleDirectMessage}>
                         <ListItemIcon>
                              <SvgIcon fontSize="small">
                                   <PersonIcon />
                              </SvgIcon>
                         </ListItemIcon>
                         <ListItemText>Direct Message</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleCreateGroup}>
                         <ListItemIcon>
                              <SvgIcon fontSize="small">
                                   <GroupIcon />
                              </SvgIcon>
                         </ListItemIcon>
                         <ListItemText>Create Group</ListItemText>
                    </MenuItem>
               </Menu>

               {/* User Selection Dialog */}
               <UserSelectionDialog
                    open={userSelectionOpen}
                    onClose={handleUserSelectionClose}
                    onStartDirectMessage={handleStartDirectMessage}
                    mode={groupCreationMode ? 'group-members' : 'direct-message'}
                    title={groupCreationMode ? 'Select Group Members' : 'Start Direct Message'}
                    buildingId={buildingId || ''}
                    selectedUsers={selectedGroupMembers.map(id => ({
                         id,
                         first_name: 'Selected',
                         last_name: 'User',
                         email: '',
                         apartment_id: '',
                         apartment: { apartment_number: '', building: { street_address: '', city: '' } },
                         is_primary: false,
                         move_in_date: '',
                         tenant_type: 'owner' as const,
                         email_opt_in: false,
                         sms_opt_in: false,
                         viber_opt_in: false,
                         whatsapp_opt_in: false,
                    } as Tenant))}
                    onSelectedUsersChange={(users) => {
                         setSelectedGroupMembers(users.map(u => u.id));
                    }}
               />
          </Box>
     );
};

export default SupabaseChat;