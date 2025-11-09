'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { useAuth } from 'src/contexts/auth/auth-provider';
import { TABLES } from 'src/libs/supabase/tables';
import {
     getUserChatRooms,
     getRoomMessages,
     sendMessage,
     markRoomAsRead,
     setTypingIndicator,
     getUnreadMessageCount
} from 'src/app/actions/chat/chat-actions';
import type {
     ChatRoom,
     ChatMessage,
     ChatRoomWithMembers,
     ChatMessageWithSender
} from 'src/types/chat';
import log from 'src/utils/logger';
import {
     saveChatRooms,
     loadChatRooms,
     saveChatMessages,
     loadChatMessages,
     cleanupExpiredData
} from 'src/utils/chat-persistence';

/**
 * Helper function to deduplicate messages by ID
 */
const deduplicateMessages = (messages: ChatMessageWithSender[]): ChatMessageWithSender[] => {
     const seen = new Set();
     return messages.filter(msg => {
          const id = msg.id;
          if (seen.has(id)) {
               return false;
          }
          seen.add(id);
          return true;
     });
};

/**
 * Hook for managing chat rooms with localStorage persistence
 */
export const useChatRooms = () => {
     const [rooms, setRooms] = useState<ChatRoomWithMembers[]>([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const auth = useAuth();
     const user = auth.userData;

     // Load rooms from cache on mount
     useEffect(() => {
          const cachedRooms = loadChatRooms();
          if (cachedRooms.length > 0) {
               setRooms(cachedRooms);
               console.log('🏠 Loaded cached rooms:', cachedRooms.length);
          }
          // Clean up expired data
          cleanupExpiredData();
     }, []);

     const loadRooms = useCallback(async () => {
          if (!user) return;

          console.log('🏠 Loading chat rooms for user:', user.id);
          setLoading(true);
          setError(null);

          try {
               const result = await getUserChatRooms();
               if (result.success && result.data) {
                    setRooms(result.data);
                    // Save to localStorage for persistence
                    saveChatRooms(result.data);
                    console.log('🏠 Successfully loaded and cached rooms:', result.data.length);
               } else {
                    setError(result.error || 'Failed to load chat rooms');
               }
          } catch (err: any) {
               console.error('❌ Error loading rooms:', err);
               setError('Failed to load chat rooms');
          } finally {
               setLoading(false);
          }
     }, [user]);

     useEffect(() => {
          loadRooms();
     }, [loadRooms]);

     // Subscribe to realtime room changes
     useEffect(() => {
          if (!user) return;

          const channel = supabaseBrowserClient
               .channel('chat-rooms')
               .on('postgres_changes',
                    {
                         event: '*',
                         schema: 'public',
                         table: TABLES.CHAT_ROOMS
                    },
                    () => {
                         loadRooms(); // Reload rooms when there are changes
                    }
               )
               .on('postgres_changes',
                    {
                         event: '*',
                         schema: 'public',
                         table: TABLES.CHAT_ROOM_MEMBERS
                    },
                    () => {
                         loadRooms(); // Reload rooms when membership changes
                    }
               )
               .on('postgres_changes',
                    {
                         event: 'INSERT',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGES
                    },
                    () => {
                         // When new messages are sent, refresh room list to update last message
                         loadRooms();
                    }
               )
               .subscribe();

          return () => {
               supabaseBrowserClient.removeChannel(channel);
          };
     }, [user, loadRooms]);

     return {
          rooms,
          loading,
          error,
          refreshRooms: loadRooms
     };
};

/**
 * Hook for managing messages in a specific chat room with localStorage persistence
 */
export const useChatMessages = (roomId: string | null) => {
     const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [hasMore, setHasMore] = useState(true);
     const auth = useAuth();
     const user = auth.tenant;
     const messageCountRef = useRef(0);

     // Update ref when messages change
     useEffect(() => {
          messageCountRef.current = messages.length;
     }, [messages.length]);

     // Load messages from cache when roomId changes
     useEffect(() => {
          if (roomId) {
               const cachedMessages = loadChatMessages(roomId);
               if (cachedMessages.length > 0) {
                    setMessages(cachedMessages);
                    console.log('💬 Loaded cached messages for room:', roomId, cachedMessages.length);
               }
          }
     }, [roomId]);

     const loadMessages = useCallback(async (offset = 0, limit = 50) => {
          if (!roomId || !user) return;

          try {
               setLoading(true);
               const result = await getRoomMessages(roomId, limit, offset);
               if (result.success && result.data) {
                    if (offset === 0) {
                         setMessages(result.data);
                         // Save to localStorage for persistence
                         saveChatMessages(roomId, result.data);
                    } else {
                         setMessages(prevMessages => {
                              const newMessages = [...result.data!, ...prevMessages];
                              saveChatMessages(roomId, newMessages);
                              return newMessages;
                         });
                    }
                    setHasMore(result.data.length === limit);
                    setError(null);
               } else {
                    setError(result.error || 'Failed to load messages');
               }
          } catch (e: any) {
               log(`Error loading messages: ${e.message}`);
               setError(e.message);
          } finally {
               setLoading(false);
          }
     }, [roomId, user]);

     const sendNewMessage = useCallback(async (content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
          if (!roomId || !user) return false;

          // Create optimistic message with proper typing
          const optimisticMessage: ChatMessageWithSender = {
               id: `temp-${Date.now()}`, // Temporary ID
               room_id: roomId,
               sender_id: user.id,
               sender_type: 'tenant' as const,
               message_text: content,
               message_type: messageType,
               created_at: new Date().toISOString(),
               is_edited: false,
               reaction_data: {},
               sender: {
                    id: user.id,
                    first_name: user.first_name || 'You',
                    last_name: user.last_name || '',
                    email: user.email || '',
                    user_type: 'tenant' as const
               },
               // Mark as pending (extra property not in type)
               _pending: true
          } as ChatMessageWithSender & { _pending: boolean };

          // Add optimistic message immediately
          setMessages(prevMessages => {
               const newMessages = [...prevMessages, optimisticMessage];
               // Save optimistic message to cache
               saveChatMessages(roomId, newMessages);
               return newMessages;
          });

          try {
               const result = await sendMessage({
                    room_id: roomId,
                    message_text: content,
                    message_type: messageType
               });

               if (result.success && result.data) {
                    // Replace optimistic message with real one, ensuring proper typing
                    setMessages(prevMessages => {
                         const updatedMessages = prevMessages.map(msg => {
                              if (msg.id === optimisticMessage.id) {
                                   // Create properly typed message from server response
                                   const realMessage: ChatMessageWithSender = {
                                        id: result.data!.id,
                                        room_id: result.data!.room_id,
                                        sender_id: result.data!.sender_id,
                                        sender_type: result.data!.sender_type as 'tenant' | 'client' | 'admin',
                                        message_text: result.data!.message_text,
                                        message_type: result.data!.message_type as 'text' | 'image' | 'file' | 'system',
                                        created_at: result.data!.created_at,
                                        is_edited: result.data!.is_edited || false,
                                        reaction_data: result.data!.reaction_data || {},
                                        reply_to_message_id: result.data!.reply_to_message_id,
                                        file_url: result.data!.file_url,
                                        file_name: result.data!.file_name,
                                        file_size: result.data!.file_size,
                                        deleted_at: result.data!.deleted_at,
                                        edited_at: result.data!.edited_at,
                                        sender: optimisticMessage.sender
                                   };
                                   return realMessage;
                              }
                              return msg;
                         });
                         // Save real message to cache
                         saveChatMessages(roomId, updatedMessages);
                         return updatedMessages;
                    });
                    return true;
               } else {
                    // Remove optimistic message on failure
                    setMessages(prevMessages => {
                         const failedMessages = prevMessages.filter(msg => msg.id !== optimisticMessage.id);
                         saveChatMessages(roomId, failedMessages);
                         return failedMessages;
                    });
                    setError(result.error || 'Failed to send message');
                    return false;
               }
          } catch (e: any) {
               // Remove optimistic message on error
               setMessages(prevMessages => {
                    const errorMessages = prevMessages.filter(msg => msg.id !== optimisticMessage.id);
                    saveChatMessages(roomId, errorMessages);
                    return errorMessages;
               });
               log(`Error sending message: ${e.message}`);
               setError(e.message);
               return false;
          }
     }, [roomId, user]);

     const markAsRead = useCallback(async () => {
          if (!roomId || !user) return;

          try {
               await markRoomAsRead(roomId, user.id);
          } catch (e: any) {
               log(`Error marking messages as read: ${e.message}`);
          }
     }, [roomId, user]);

     const loadMoreMessages = useCallback(() => {
          if (!hasMore || loading) return;
          loadMessages(messageCountRef.current);
     }, [hasMore, loading, loadMessages]);

     // Load messages when room changes
     useEffect(() => {
          if (roomId) {
               setMessages([]);
               setHasMore(true);
               loadMessages(0);
          }
     }, [roomId, loadMessages]);

     // Subscribe to realtime message changes
     useEffect(() => {
          if (!roomId || !user) return;

          const channel = supabaseBrowserClient
               .channel(`chat-messages-${roomId}`)
               .on('postgres_changes',
                    {
                         event: 'INSERT',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGES,
                         filter: `room_id=eq.${roomId}`
                    },
                    async (payload: any) => {
                         const newMessage = payload.new as any;

                         console.log('📨 Real-time message received:', {
                              id: newMessage.id,
                              sender_id: newMessage.sender_id,
                              message_text: newMessage.message_text,
                              room_id: newMessage.room_id
                         });

                         // Don't add our own messages twice (they're added optimistically when sending)
                         if (newMessage.sender_id === user.id) {
                              console.log('🚫 Skipping own message (already added optimistically)');
                              return;
                         }

                         try {
                              // Fetch sender info for the new message
                              let sender: any = {
                                   id: newMessage.sender_id,
                                   user_type: newMessage.sender_type,
                                   first_name: 'Loading...',
                                   last_name: '',
                                   email: ''
                              };

                              if (newMessage.sender_type === 'tenant') {
                                   const { data: tenant } = await supabaseBrowserClient
                                        .from(TABLES.TENANTS)
                                        .select('first_name, last_name, email')
                                        .eq('user_id', newMessage.sender_id)
                                        .single();

                                   if (tenant) {
                                        sender = { ...sender, ...tenant };
                                   }
                              } else if (newMessage.sender_type === 'client') {
                                   const { data: client } = await supabaseBrowserClient
                                        .from(TABLES.CLIENTS)
                                        .select('company_name, email')
                                        .eq('user_id', newMessage.sender_id)
                                        .single();

                                   if (client) {
                                        sender = {
                                             ...sender,
                                             first_name: client.company_name || 'Client',
                                             last_name: '',
                                             email: client.email
                                        };
                                   }
                              }

                              // Add the new message with proper sender info
                              const messageWithSender = {
                                   ...newMessage,
                                   sender
                              };

                              console.log('✅ Adding new message with sender info:', messageWithSender);
                              setMessages(prev => {
                                   const deduplicatedMessages = deduplicateMessages([...prev, messageWithSender]);
                                   // Save updated messages to cache
                                   saveChatMessages(roomId, deduplicatedMessages);
                                   return deduplicatedMessages;
                              });
                         } catch (error) {
                              log(`Error fetching sender info for new message: ${error}`);
                              // Fallback: add message with basic info and reload
                              const fallbackMessage = {
                                   ...newMessage,
                                   sender: {
                                        id: newMessage.sender_id,
                                        first_name: 'Unknown User',
                                        last_name: '',
                                        email: ''
                                   }
                              };
                              setMessages(prev => {
                                   const deduplicatedMessages = deduplicateMessages([...prev, fallbackMessage]);
                                   // Save fallback messages to cache
                                   saveChatMessages(roomId, deduplicatedMessages);
                                   return deduplicatedMessages;
                              });
                         }
                    }
               )
               .on('postgres_changes',
                    {
                         event: 'UPDATE',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGES,
                         filter: `room_id=eq.${roomId}`
                    },
                    () => {
                         loadMessages(0); // Reload messages on update
                    }
               )
               .on('postgres_changes',
                    {
                         event: 'DELETE',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGES,
                         filter: `room_id=eq.${roomId}`
                    },
                    () => {
                         loadMessages(0); // Reload messages on delete
                    }
               )
               .subscribe();

          return () => {
               supabaseBrowserClient.removeChannel(channel);
          };
     }, [roomId, user, loadMessages]);

     // Mark messages as read when room changes or new messages arrive
     useEffect(() => {
          if (roomId && messages.length > 0) {
               markAsRead();
          }
     }, [roomId, messages.length, markAsRead]);

     return {
          messages,
          loading,
          error,
          hasMore,
          sendMessage: sendNewMessage,
          loadMoreMessages,
          refreshMessages: () => loadMessages(0)
     };
};/**
 * Hook for managing typing indicators
 */
export const useTypingIndicators = (roomId: string | null) => {
     const [typingUsers, setTypingUsers] = useState<any[]>([]);
     const auth = useAuth();
     const user = auth.userData;

     const setIsTyping = useCallback(async (isTyping: boolean) => {
          if (!roomId || !user) return;

          try {
               await setTypingIndicator(roomId, user.id, isTyping);
          } catch (e: any) {
               log(`Error setting typing indicator: ${e.message}`);
          }
     }, [roomId, user]);

     // Subscribe to typing indicators
     useEffect(() => {
          if (!roomId) return;

          const channel = supabaseBrowserClient
               .channel(`typing-${roomId}`)
               .on('postgres_changes',
                    {
                         event: '*',
                         schema: 'public',
                         table: TABLES.CHAT_TYPING,
                         filter: `room_id=eq.${roomId}`
                    },
                    (payload: any) => {
                         // Update typing users list
                         if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                              const typingUser = payload.new as any;
                              if (typingUser.user_id !== user?.id) { // Don't show own typing
                                   setTypingUsers(prev => {
                                        const filtered = prev.filter(u => u.user_id !== typingUser.user_id);
                                        return [...filtered, typingUser];
                                   });
                              }
                         } else if (payload.eventType === 'DELETE') {
                              const deletedUser = payload.old as any;
                              setTypingUsers(prev => prev.filter(u => u.user_id !== deletedUser.user_id));
                         }
                    }
               )
               .subscribe();

          // Clean up old typing indicators every 5 seconds
          const cleanupInterval = setInterval(() => {
               const fiveSecondsAgo = new Date(Date.now() - 5000);
               setTypingUsers(prev =>
                    prev.filter(u => new Date(u.started_at) > fiveSecondsAgo)
               );
          }, 5000);

          return () => {
               supabaseBrowserClient.removeChannel(channel);
               clearInterval(cleanupInterval);
          };
     }, [roomId, user]);

     return {
          typingUsers: typingUsers.filter(u => u.user_id !== user?.id),
          setIsTyping
     };
};

/**
 * Hook for managing unread message count
 */
export const useUnreadCount = () => {
     const [unreadCount, setUnreadCount] = useState(0);
     const [loading, setLoading] = useState(true);
     const auth = useAuth();
     const user = auth.userData;

     const loadUnreadCount = useCallback(async () => {
          if (!user) return;

          try {
               const result = await getUnreadMessageCount(user.id);
               if (result.success && typeof result.data === 'number') {
                    setUnreadCount(result.data);
               }
          } catch (e: any) {
               log(`Error loading unread count: ${e.message}`);
          } finally {
               setLoading(false);
          }
     }, [user]);

     useEffect(() => {
          loadUnreadCount();
     }, [loadUnreadCount]);

     // Subscribe to message changes to update unread count
     useEffect(() => {
          if (!user) return;

          const channel = supabaseBrowserClient
               .channel('unread-count')
               .on('postgres_changes',
                    {
                         event: 'INSERT',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGES
                    },
                    () => {
                         loadUnreadCount();
                    }
               )
               .on('postgres_changes',
                    {
                         event: 'INSERT',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGE_READS
                    },
                    () => {
                         loadUnreadCount();
                    }
               )
               .subscribe();

          return () => {
               supabaseBrowserClient.removeChannel(channel);
          };
     }, [user, loadUnreadCount]);

     return {
          unreadCount,
          loading,
          refreshUnreadCount: loadUnreadCount
     };
};