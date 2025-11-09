// Chat System Types for Real-time Building Communication

export interface ChatRoom {
  id: string;
  name?: string;
  description?: string;
  room_type: 'direct' | 'group' | 'building';
  building_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  last_message_at: string;
}

export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  user_type: 'tenant' | 'client' | 'admin';
  role: 'member' | 'admin' | 'moderator';
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id?: string;
  sender_type: 'tenant' | 'client' | 'admin';
  message_text: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  reply_to_message_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  deleted_at?: string;
  reaction_data: Record<string, string[]>; // emoji -> user_ids
}

export interface ChatMessageRead {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface ChatTyping {
  id: string;
  room_id: string;
  user_id: string;
  is_typing: boolean;
  started_typing_at: string;
}

// Extended types with joined data
export interface ChatMessageWithSender extends ChatMessage {
  sender?: {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    user_type: 'tenant' | 'client' | 'admin';
  };
  reply_to_message?: ChatMessage;
  read_receipts?: ChatMessageRead[];
}

export interface ChatRoomWithMembers extends ChatRoom {
  members: (ChatRoomMember & {
    user: {
      id: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
  })[];
  last_message?: ChatMessageWithSender;
  unread_count?: number;
}

export interface TypingIndicator {
  room_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

// Chat UI State Types
export interface ChatState {
  rooms: ChatRoomWithMembers[];
  activeRoom?: ChatRoomWithMembers;
  messages: Record<string, ChatMessageWithSender[]>; // roomId -> messages
  typingIndicators: Record<string, TypingIndicator[]>; // roomId -> typing users
  loading: boolean;
  error?: string;
}

// API Response Types
export interface CreateRoomPayload {
  name?: string;
  description?: string;
  room_type: 'direct' | 'group' | 'building';
  building_id: string;
  member_user_ids?: string[];
}

export interface SendMessagePayload {
  room_id: string;
  message_text: string;
  message_type?: 'text' | 'image' | 'file';
  reply_to_message_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
}

export interface UpdateTypingPayload {
  room_id: string;
  is_typing: boolean;
}

export interface MarkAsReadPayload {
  room_id: string;
  message_id: string;
}

// Legacy types (kept for backward compatibility)
export interface Contact {
  id: string;
  avatar: string;
  isActive: boolean;
  lastActivity?: number;
  name: string;
}

interface Attachment {
  id: string;
  url: string;
}

export interface Message {
  id: string;
  attachments: Attachment[];
  body: string;
  contentType: string;
  created_at: number;
  authorId: string;
}

export interface Participant {
  id: string;
  avatar: string | null;
  lastActivity?: number;
  name: string;
}

export interface Thread {
  id?: string;
  messages: Message[];
  participantIds: string[];
  participants?: Participant[];
  type: 'ONE_TO_ONE' | 'GROUP';
  unreadCount?: number;
}
