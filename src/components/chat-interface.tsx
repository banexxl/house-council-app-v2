'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
     Box,
     Card,
     CardContent,
     CardHeader,
     Typography,
     TextField,
     IconButton,
     List,
     ListItem,
     ListItemButton,
     ListItemText,
     Avatar,
     Chip,
     Divider,
     Badge,
     Stack,
     Button,
     Dialog,
     DialogTitle,
     DialogContent,
     DialogActions,
     CircularProgress,
     Alert
} from '@mui/material';
import {
     Send as SendIcon,
     Add as AddIcon,
     Group as GroupIcon,
     Person as PersonIcon,
     MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useChatRooms, useChatMessages, useTypingIndicators, useUnreadCount } from 'src/hooks/use-chat';
import { createDirectMessageRoom, createBuildingGroupChat } from 'src/app/actions/chat/chat-actions';
import { useAuth } from 'src/contexts/auth/auth-provider';
import type { ChatRoomWithMembers } from 'src/types/chat';

interface ChatInterfaceProps {
     buildingId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ buildingId }) => {
     const [selectedRoom, setSelectedRoom] = useState<ChatRoomWithMembers | null>(null);
     const [messageText, setMessageText] = useState('');
     const [createRoomDialogOpen, setCreateRoomDialogOpen] = useState(false);
     const [newRoomName, setNewRoomName] = useState('');
     const [isTyping, setIsTyping] = useState(false);
     const messageInputRef = useRef<HTMLInputElement>(null);
     const messagesEndRef = useRef<HTMLDivElement>(null);

     const auth = useAuth();
     const user = auth.userData;

     const { rooms, loading: roomsLoading, error: roomsError } = useChatRooms();
     const { messages, loading: messagesLoading, sendMessage, loadMoreMessages, hasMore } = useChatMessages(selectedRoom?.id || null);
     const { typingUsers, setIsTyping: setTypingIndicator } = useTypingIndicators(selectedRoom?.id || null);
     const { unreadCount } = useUnreadCount();

     // Auto-scroll to bottom when new messages arrive
     useEffect(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }, [messages]);

     // Handle typing indicators
     useEffect(() => {
          let typingTimeout: NodeJS.Timeout;

          if (isTyping) {
               setTypingIndicator(true);
               typingTimeout = setTimeout(() => {
                    setIsTyping(false);
                    setTypingIndicator(false);
               }, 2000);
          } else {
               setTypingIndicator(false);
          }

          return () => {
               if (typingTimeout) clearTimeout(typingTimeout);
          };
     }, [isTyping, setTypingIndicator]);

     const handleSendMessage = async () => {
          if (!messageText.trim() || !selectedRoom) return;

          const success = await sendMessage(messageText.trim());
          if (success) {
               setMessageText('');
               setIsTyping(false);
          }
     };

     const handleKeyPress = (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) {
               e.preventDefault();
               handleSendMessage();
          }
     };

     const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setMessageText(e.target.value);
          if (!isTyping && e.target.value.length > 0) {
               setIsTyping(true);
          } else if (isTyping && e.target.value.length === 0) {
               setIsTyping(false);
          }
     };

     const handleCreateGroupChat = async () => {
          if (!newRoomName.trim() || !buildingId) return;

          try {
               const result = await createBuildingGroupChat(buildingId, newRoomName.trim());
               if (result.success) {
                    setCreateRoomDialogOpen(false);
                    setNewRoomName('');
                    // Room list will update automatically via realtime subscription
               }
          } catch (error) {
               console.error('Error creating group chat:', error);
          }
     };

     const formatMessageTime = (timestamp: string) => {
          const date = new Date(timestamp);
          const now = new Date();
          const isToday = date.toDateString() === now.toDateString();

          if (isToday) {
               return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
     };

     const getRoomDisplayName = (room: ChatRoomWithMembers) => {
          if (room.room_type === 'direct') {
               // For direct messages, show the other person's name
               const otherMember = room.members.find(m => m.user_id !== user?.id);
               return otherMember?.user ? `${otherMember.user.first_name} ${otherMember.user.last_name}` : 'Direct Message';
          }
          return room.name || 'Group Chat';
     };

     const getRoomAvatar = (room: ChatRoomWithMembers) => {
          if (room.room_type === 'direct') {
               return <PersonIcon />;
          }
          return <GroupIcon />;
     };

     if (roomsError) {
          return (
               <Card>
                    <CardContent>
                         <Alert severity="error">{roomsError}</Alert>
                    </CardContent>
               </Card>
          );
     }

     return (
          <Box sx={{ display: 'flex', height: '600px', border: 1, borderColor: 'divider', borderRadius: 1 }}>
               {/* Chat Rooms List */}
               <Box sx={{ width: '300px', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Typography variant="h6">
                              Chats
                              {unreadCount > 0 && (
                                   <Chip
                                        label={unreadCount}
                                        size="small"
                                        color="primary"
                                        sx={{ ml: 1 }}
                                   />
                              )}
                         </Typography>
                         {buildingId && (
                              <IconButton
                                   size="small"
                                   onClick={() => setCreateRoomDialogOpen(true)}
                                   title="Create Group Chat"
                              >
                                   <AddIcon />
                              </IconButton>
                         )}
                    </Box>

                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                         {roomsLoading ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                   <CircularProgress size={24} />
                              </Box>
                         ) : (
                              <List dense>
                                   {rooms.map((room) => (
                                        <ListItem key={room.id} disablePadding>
                                             <ListItemButton
                                                  selected={selectedRoom?.id === room.id}
                                                  onClick={() => setSelectedRoom(room)}
                                                  sx={{
                                                       '&.Mui-selected': {
                                                            backgroundColor: 'primary.light',
                                                            '&:hover': {
                                                                 backgroundColor: 'primary.light',
                                                            },
                                                       },
                                                  }}
                                             >
                                                  <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                                                       {getRoomAvatar(room)}
                                                  </Avatar>
                                                  <ListItemText
                                                       primary={getRoomDisplayName(room)}
                                                       secondary={room.room_type === 'group' ? `${room.members.length} members` : 'Direct message'}
                                                       primaryTypographyProps={{ variant: 'body2', fontWeight: selectedRoom?.id === room.id ? 'bold' : 'normal' }}
                                                       secondaryTypographyProps={{ variant: 'caption' }}
                                                  />
                                             </ListItemButton>
                                        </ListItem>
                                   ))}
                                   {rooms.length === 0 && (
                                        <ListItem>
                                             <ListItemText
                                                  primary="No chats yet"
                                                  secondary="Start a conversation!"
                                                  sx={{ textAlign: 'center' }}
                                             />
                                        </ListItem>
                                   )}
                              </List>
                         )}
                    </Box>
               </Box>

               {/* Chat Messages Area */}
               <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {selectedRoom ? (
                         <>
                              {/* Chat Header */}
                              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <Box>
                                        <Typography variant="h6">{getRoomDisplayName(selectedRoom)}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                             {selectedRoom.room_type === 'group' && `${selectedRoom.members.length} members`}
                                             {typingUsers.length > 0 && (
                                                  <span style={{ color: '#1976d2' }}>
                                                       {` • ${typingUsers.length === 1
                                                            ? `${typingUsers[0].user?.first_name || 'Someone'} is typing...`
                                                            : `${typingUsers.length} people are typing...`}`}
                                                  </span>
                                             )}
                                        </Typography>
                                   </Box>
                                   <IconButton size="small">
                                        <MoreVertIcon />
                                   </IconButton>
                              </Box>

                              {/* Messages List */}
                              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                                   {hasMore && (
                                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                                             <Button onClick={loadMoreMessages} size="small">
                                                  Load older messages
                                             </Button>
                                        </Box>
                                   )}

                                   {messagesLoading && messages.length === 0 ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                             <CircularProgress size={24} />
                                        </Box>
                                   ) : (
                                        <Stack spacing={1}>
                                             {messages.map((message) => {
                                                  const isOwnMessage = message.sender_id === user?.id;
                                                  return (
                                                       <Box
                                                            key={message.id}
                                                            sx={{
                                                                 display: 'flex',
                                                                 justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                                                                 mb: 1
                                                            }}
                                                       >
                                                            <Box
                                                                 sx={{
                                                                      maxWidth: '70%',
                                                                      bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                                                                      color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                                                                      borderRadius: 2,
                                                                      p: 1.5,
                                                                      position: 'relative'
                                                                 }}
                                                            >
                                                                 {!isOwnMessage && selectedRoom.room_type === 'group' && (
                                                                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                                                           {message.sender?.first_name} {message.sender?.last_name}
                                                                      </Typography>
                                                                 )}
                                                                 <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                                      {message.message_text}
                                                                 </Typography>
                                                                 <Typography
                                                                      variant="caption"
                                                                      sx={{
                                                                           display: 'block',
                                                                           textAlign: 'right',
                                                                           mt: 0.5,
                                                                           opacity: 0.7,
                                                                           fontSize: '0.7rem'
                                                                      }}
                                                                 >
                                                                      {formatMessageTime(message.created_at)}
                                                                 </Typography>
                                                            </Box>
                                                       </Box>
                                                  );
                                             })}
                                             <div ref={messagesEndRef} />
                                        </Stack>
                                   )}
                              </Box>

                              {/* Message Input */}
                              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                                   <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                             ref={messageInputRef}
                                             fullWidth
                                             size="small"
                                             placeholder="Type a message..."
                                             value={messageText}
                                             onChange={handleMessageInputChange}
                                             onKeyPress={handleKeyPress}
                                             multiline
                                             maxRows={3}
                                        />
                                        <IconButton
                                             color="primary"
                                             onClick={handleSendMessage}
                                             disabled={!messageText.trim()}
                                        >
                                             <SendIcon />
                                        </IconButton>
                                   </Box>
                              </Box>
                         </>
                    ) : (
                         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                              <Typography variant="body1" color="text.secondary">
                                   Select a chat to start messaging
                              </Typography>
                         </Box>
                    )}
               </Box>

               {/* Create Group Chat Dialog */}
               <Dialog open={createRoomDialogOpen} onClose={() => setCreateRoomDialogOpen(false)}>
                    <DialogTitle>Create Group Chat</DialogTitle>
                    <DialogContent>
                         <TextField
                              autoFocus
                              margin="dense"
                              label="Group Name"
                              fullWidth
                              variant="outlined"
                              value={newRoomName}
                              onChange={(e) => setNewRoomName(e.target.value)}
                              onKeyPress={(e) => {
                                   if (e.key === 'Enter') {
                                        handleCreateGroupChat();
                                   }
                              }}
                         />
                    </DialogContent>
                    <DialogActions>
                         <Button onClick={() => setCreateRoomDialogOpen(false)}>Cancel</Button>
                         <Button onClick={handleCreateGroupChat} variant="contained" disabled={!newRoomName.trim()}>
                              Create
                         </Button>
                    </DialogActions>
               </Dialog>
          </Box>
     );
};