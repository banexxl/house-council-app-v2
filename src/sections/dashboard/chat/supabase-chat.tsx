'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Drawer, useMediaQuery, Theme, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, SvgIcon, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import PersonIcon from '@untitled-ui/icons-react/build/esm/User01';
import GroupIcon from '@untitled-ui/icons-react/build/esm/Users01';
import { useChatRooms, useChatMessages, useTypingIndicators } from 'src/hooks/use-chat';
import { sendMessage, createBuildingGroupChat, createDirectMessageRoom, fixExistingChatRooms } from 'src/app/actions/chat/chat-actions';
import { searchBuildingUsers } from 'src/app/actions/tenant/tenant-actions';
import { useAuth } from 'src/contexts/auth/auth-provider';
import { UserSelectionDialog } from 'src/components/chat/UserSelectionDialog';
import type { ChatRoomWithMembers, ChatMessageWithSender, SendMessagePayload } from 'src/types/chat';
import type { BuildingUser } from 'src/app/actions/tenant/tenant-actions';

import { ChatContainer } from './chat-container';
import { ChatSidebar } from './chat-sidebar';
import { ChatThread } from './chat-thread';
import { ChatBlank } from './chat-blank';

// Import test function for development
import '../../../utils/test-realtime';

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
const adaptMembersToParticipants = (members: any[]) => {
     return members.map(member => ({
          id: member.user_id,
          name: member.user ? `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() || member.user.email : 'Unknown User',
          avatar: '', // We don't have avatar URLs in our current system
          email: member.user?.email,
          user_type: member.user_type,
          isOnline: false // This would be determined by presence system
     }));
};

export const SupabaseChat: React.FC<SupabaseChatProps> = ({ buildingId }) => {
     const [sidebarOpen, setSidebarOpen] = useState(true);
     const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
     const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithMembers | null>(null);
     const [userSelectionOpen, setUserSelectionOpen] = useState(false);
     const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);
     const [groupCreationMode, setGroupCreationMode] = useState(false);
     const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
     const [newGroupName, setNewGroupName] = useState('');

     const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
     const auth = useAuth();
     const currentUser = auth.userData;

     // One-time fix for existing chat rooms
     useEffect(() => {
          const runFix = async () => {
               try {
                    const result = await fixExistingChatRooms();
                    console.log('🔧 Fixed existing chat rooms:', result);
               } catch (error) {
                    console.error('❌ Failed to fix existing chat rooms:', error);
               }
          };
          runFix();
     }, []); // Run only once

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
     const { typingUsers, setIsTyping } = useTypingIndicators(currentThreadId);     // Debug logging for messages
     useEffect(() => {
          if (currentThreadId) {
               console.log('💬 Messages for thread:', {
                    threadId: currentThreadId,
                    messageCount: messages.length,
                    loading: messagesLoading,
                    latestMessages: messages.slice(-3).map(m => ({
                         id: m.id,
                         text: m.message_text,
                         sender: m.sender_id,
                         time: m.created_at
                    }))
               });
          }
     }, [currentThreadId, messages, messagesLoading]);

     // Debug logging for rooms
     useEffect(() => {
          console.log('🏠 Current user rooms:', {
               count: rooms.length,
               rooms: rooms.map(r => ({
                    id: r.id,
                    name: r.name,
                    type: r.room_type,
                    members: r.members?.length || 0,
                    lastMessage: r.last_message?.message_text
               }))
          });
     }, [rooms]);

     // Handle creating new chat options
     const handleCreateMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
          setCreateMenuAnchor(event.currentTarget);
     }, []);

     // Handle create room - adapter for ChatSidebar
     const handleCreateRoom = useCallback(() => {
          // For now, we'll just show the create menu
          // In a real implementation, this might open a different dialog
          console.log('Create room called from sidebar');
     }, []);

     const handleCreateMenuClose = useCallback(() => {
          setCreateMenuAnchor(null);
     }, []);

     const handleStartDirectMessage = useCallback((user: BuildingUser) => {
          // The UserSelectionDialog handles creating the direct message room
          // We just need to refresh the rooms list
          refreshRooms();
     }, [refreshRooms]);

     // Handle direct message creation
     const handleSelectUser = useCallback(async (user: BuildingUser) => {
          try {
               console.log('Creating direct message room with user:', user);
               console.log('Building ID:', buildingId);
               console.log('Current user:', auth.userData?.id);

               // If no buildingId provided, try to get one from the current user
               let effectiveBuildingId = buildingId;
               if (!effectiveBuildingId) {
                    console.log('No buildingId provided, will use empty string as fallback');
                    effectiveBuildingId = '';
               }

               const result = await createDirectMessageRoom(
                    user.id,
                    user.user_type || 'tenant',
                    buildingId || undefined // Pass undefined instead of empty string
               );

               console.log('Direct message room creation result:', result);

               if (result.success && result.data) {
                    const room = result.data as any;
                    console.log('Setting selected room:', room);
                    setSelectedRoom(room);
                    setCurrentThreadId(room.id);

                    // Refresh rooms to get the latest data
                    console.log('Refreshing rooms...');
                    await refreshRooms();

                    // Close mobile sidebar
                    if (!mdUp) {
                         setSidebarOpen(false);
                    }

                    console.log('Direct message creation completed successfully');
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
     const handleSearchSelection = useCallback(async (contact: any) => {
          try {
               console.log('Search selection:', contact);

               // Create BuildingUser from the contact data
               const user: BuildingUser = {
                    id: contact.id,
                    email: contact.email,
                    first_name: contact.firstName || contact.name.split(' ')[0] || '',
                    last_name: contact.lastName || contact.name.split(' ').slice(1).join(' ') || '',
                    user_type: contact.userType || 'tenant',
                    avatar: contact.avatar,
                    apartment_number: contact.apartmentNumber,
                    company_name: contact.companyName,
                    is_online: contact.isActive
               };

               console.log('Creating direct message with user:', user);
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
                         width: 380,
                         flexShrink: 0,
                         '& .MuiDrawer-paper': {
                              position: 'relative',
                              width: 380
                         }
                    }}
               >
                    <ChatSidebar
                         rooms={rooms}
                         selectedRoom={selectedRoom}
                         onRoomSelect={(room) => {
                              console.log('🎯 Room selected:', {
                                   id: room.id,
                                   name: room.name,
                                   type: room.room_type,
                                   members: room.members?.length
                              });
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
                    {currentThreadId && selectedRoom ? (
                         <ChatThread
                              threadKey={threadKey}
                              messages={adaptedMessages}
                              participants={adaptedParticipants}
                              currentUser={adaptedCurrentUser}
                              onSendMessage={handleSendMessage}
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
                    onStartDirectMessage={handleSelectUser}
                    mode={groupCreationMode ? 'group-members' : 'direct-message'}
                    title={groupCreationMode ? 'Select Group Members' : 'Start Direct Message'}
                    buildingId={buildingId || ''}
                    selectedUsers={selectedGroupMembers.map(id => ({ id } as BuildingUser))}
                    onSelectedUsersChange={(users) => {
                         setSelectedGroupMembers(users.map(u => u.id));
                    }}
               />

               {/* Temporary debug button - remove in production */}
               {process.env.NODE_ENV === 'development' && (
                    <Button
                         variant="outlined"
                         color="secondary"
                         onClick={async () => {
                              try {
                                   const result = await fixExistingChatRooms();
                                   console.log('🔧 Manual fix result:', result);
                                   alert(`Fixed ${result.data || 0} chat rooms`);
                                   // Refresh rooms after fix
                                   refreshRooms();
                              } catch (error) {
                                   console.error('❌ Manual fix failed:', error);
                                   alert('Failed to fix chat rooms');
                              }
                         }}
                         sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}
                    >
                         Fix Chat Rooms
                    </Button>
               )}
          </Box>
     );
};

export default SupabaseChat;