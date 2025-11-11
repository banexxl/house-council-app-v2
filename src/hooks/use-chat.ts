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
          }
          // Clean up expired data
          cleanupExpiredData();
     }, []);

     const loadRooms = useCallback(async () => {
          if (!user) return;

          setLoading(true);
          setError(null);

          try {
               const result = await getUserChatRooms();
               if (result.success && result.data) {
                    setRooms(result.data);
                    // Save to localStorage for persistence
                    saveChatRooms(result.data);
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
               // Check if we have recent cached messages first
               const cachedMessages = loadChatMessages(roomId);
               if (cachedMessages.length > 0) {
                    setMessages(cachedMessages);
                    setHasMore(cachedMessages.length >= 50); // Assume more if we have 50+ messages
                    return;
               }

               // Only clear and reload if no cache
               setMessages([]);
               setHasMore(true);
               loadMessages(0);
          }
     }, [roomId]); // Remove loadMessages from dependencies to prevent unnecessary reloads

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
                         // Don't add our own messages twice (they're added optimistically when sending)
                         if (newMessage.sender_id === user.id) {
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

                              setMessages(prev => {
                                   const deduplicatedMessages = deduplicateMessages([...prev, messageWithSender]);
                                   // Save updated messages to cache
                                   saveChatMessages(roomId, deduplicatedMessages);

                                   // Dispatch custom event to notify components about new message
                                   setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('newRealtimeMessage', {
                                             detail: { roomId, messageId: messageWithSender.id }
                                        }));
                                   }, 100);

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

                                   // Dispatch custom event to notify components about new message
                                   setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('newRealtimeMessage', {
                                             detail: { roomId, messageId: fallbackMessage.id }
                                        }));
                                   }, 100);

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
                    (payload: any) => {
                         // Instead of reloading all messages, just update the specific message
                         const updatedMessage = payload.new as any;
                         setMessages(prev => {
                              const updated = prev.map(msg =>
                                   msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
                              );
                              saveChatMessages(roomId, updated);
                              return updated;
                         });
                    }
               )
               .on('postgres_changes',
                    {
                         event: 'DELETE',
                         schema: 'public',
                         table: TABLES.CHAT_MESSAGES,
                         filter: `room_id=eq.${roomId}`
                    },
                    (payload: any) => {
                         // Remove the deleted message instead of reloading all
                         const deletedMessage = payload.old as any;
                         setMessages(prev => {
                              const filtered = prev.filter(msg => msg.id !== deletedMessage.id);
                              saveChatMessages(roomId, filtered);
                              return filtered;
                         });
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
};

/**
 * Hook for managing typing indicators using Supabase broadcast
 */
export const useTypingIndicators = (roomId: string | null) => {
     const [typingUsers, setTypingUsers] = useState<any[]>([]);
     const auth = useAuth();
     const user = auth.userData;
     const channelRef = useRef<any>(null);
     const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
     const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
     const isCurrentlyTypingRef = useRef(false);
     const subscriptionInitializedRef = useRef<string | null>(null); // Track if subscription is already set up

     // Debug log to track hook re-initialization
     useEffect(() => {
          // Hook initialization tracking removed for production
     }, [roomId, user?.id, typingUsers.length]);

     const setIsTyping = useCallback(async (isTyping: boolean) => {
          if (!roomId || !user || !channelRef.current) {
               return;
          }

          try {
               if (isTyping) {
                    // Clear any existing timeout when user starts typing
                    if (typingTimeoutRef.current) {
                         clearTimeout(typingTimeoutRef.current);
                         typingTimeoutRef.current = null;
                    }

                    // Set typing state
                    isCurrentlyTypingRef.current = true;

                    // Broadcast typing start event
                    const typingData = {
                         user_id: user.id,
                         user_name: (user as any).first_name || user.email || 'Unknown User',
                         user_email: user.email,
                         is_typing: true,
                         timestamp: new Date().toISOString()
                    };

                    const result = await channelRef.current.send({
                         type: 'broadcast',
                         event: 'typing',
                         payload: typingData
                    });

                    // Start heartbeat to refresh typing indicator every 1.5 seconds while typing
                    if (heartbeatIntervalRef.current) {
                         clearInterval(heartbeatIntervalRef.current);
                    }

                    heartbeatIntervalRef.current = setInterval(async () => {
                         if (isCurrentlyTypingRef.current && channelRef.current) {
                              const heartbeatData = {
                                   user_id: user.id,
                                   user_name: (user as any).first_name || user.email || 'Unknown User',
                                   user_email: user.email,
                                   is_typing: true,
                                   timestamp: new Date().toISOString()
                              };

                              try {
                                   await channelRef.current.send({
                                        type: 'broadcast',
                                        event: 'typing',
                                        payload: heartbeatData
                                   });
                              } catch (error) {
                                   // Heartbeat failed silently
                              }
                         }
                    }, 1500); // Send heartbeat every 1.5 seconds

               } else {
                    // Stop typing
                    isCurrentlyTypingRef.current = false;

                    // Clear any existing timeout and heartbeat
                    if (typingTimeoutRef.current) {
                         clearTimeout(typingTimeoutRef.current);
                         typingTimeoutRef.current = null;
                    }
                    if (heartbeatIntervalRef.current) {
                         clearInterval(heartbeatIntervalRef.current);
                         heartbeatIntervalRef.current = null;
                    }

                    // Broadcast typing stop event
                    const stopData = {
                         user_id: user.id,
                         user_name: (user as any).first_name || user.email || 'Unknown User',
                         user_email: user.email,
                         is_typing: false,
                         timestamp: new Date().toISOString()
                    };

                    const result = await channelRef.current.send({
                         type: 'broadcast',
                         event: 'typing',
                         payload: stopData
                    });
               }

          } catch (e: any) {
               log(`Error broadcasting typing indicator: ${e.message}`);
          }
     }, [roomId, user]);

     // Subscribe to typing broadcasts
     useEffect(() => {
          if (!roomId || !user?.id) {
               return;
          }

          // Prevent duplicate subscriptions for the same room
          if (subscriptionInitializedRef.current === roomId) {
               return;
          }

          // Mark this subscription as initialized
          subscriptionInitializedRef.current = roomId;

          const channel = supabaseBrowserClient
               .channel(`typing-room-${roomId}`)
               .on('broadcast',
                    { event: 'typing' },
                    (payload: any) => {
                         const typingData = payload.payload;

                         // Don't show own typing
                         if (typingData.user_id === user.id) {
                              return;
                         }

                         if (typingData.is_typing) {
                              setTypingUsers(prev => {
                                   // Check if user already exists
                                   const existingUserIndex = prev.findIndex(u => u.user_id === typingData.user_id);

                                   if (existingUserIndex !== -1) {
                                        // Update existing user's timestamp (heartbeat)
                                        const updated = [...prev];
                                        updated[existingUserIndex] = {
                                             ...updated[existingUserIndex],
                                             started_at: typingData.timestamp,
                                             timestamp: typingData.timestamp
                                        };
                                        return updated;
                                   } else {
                                        // Add new typing user
                                        const newUser = {
                                             ...typingData,
                                             started_at: typingData.timestamp
                                        };
                                        return [...prev, newUser];
                                   }
                              });
                         } else {
                              setTypingUsers(prev => prev.filter(u => u.user_id !== typingData.user_id));
                         }
                    }
               )
               .subscribe();

          // Store channel reference for broadcasting
          channelRef.current = channel;

          // Clean up old typing indicators every 5 seconds, but with a longer timeout
          const cleanupInterval = setInterval(() => {
               const twentySecondsAgo = new Date(Date.now() - 20000); // 20 seconds timeout
               setTypingUsers(prev => {
                    if (prev.length === 0) {
                         // Don't run cleanup if no users to avoid unnecessary processing
                         return prev;
                    }

                    const filtered = prev.filter(u => new Date(u.started_at) > twentySecondsAgo);
                    return filtered;
               });
          }, 5000); // Check every 5 seconds

          return () => {
               // Clear timeout and heartbeat
               if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
               }
               if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
               }

               // Reset typing state
               isCurrentlyTypingRef.current = false;

               // Clean up channel
               if (channelRef.current) {
                    supabaseBrowserClient.removeChannel(channelRef.current);
                    channelRef.current = null;
               }

               clearInterval(cleanupInterval);

               // Clear typing users only if this cleanup is for the current room
               if (subscriptionInitializedRef.current === roomId) {
                    setTypingUsers([]);
               }

               // Reset subscription tracking after potential cleanup
               subscriptionInitializedRef.current = null;
          };
     }, [roomId]); // Remove user?.id from dependencies to prevent reinitialization

     return {
          typingUsers: typingUsers.filter(u => u.user_id !== user?.id),
          setIsTyping
     };
};/**
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