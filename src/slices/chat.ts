import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { Message, Thread } from 'src/types/chat';
import type { ChatRoomWithMembers, ChatMessageWithSender } from 'src/types/chat';
import { Tenant } from 'src/types/tenant';
import { objFromArray } from 'src/utils/obj-from-array';

interface ChatState {
  contacts: {
    byId: Record<string, Tenant>;
    allIds: string[];
  };
  currentThreadId?: string;
  threads: {
    byId: Record<string, Thread>;
    allIds: string[];
  };
  // Supabase chat state
  supabaseRooms: {
    byId: Record<string, ChatRoomWithMembers>;
    allIds: string[];
  };
  supabaseMessages: {
    byRoomId: Record<string, ChatMessageWithSender[]>;
  };
  currentSupabaseRoomId?: string;
}

type GetContactsAction = PayloadAction<Tenant[]>;

type GetThreadsAction = PayloadAction<Thread[]>;

type GetThreadAction = PayloadAction<Thread | null>;

type MarkThreadAsSeenAction = PayloadAction<string>;

type SetCurrentThreadAction = PayloadAction<string | undefined>;

type AddMessageAction = PayloadAction<{ message: Message; threadId: string }>;

// Supabase action types
type SetSupabaseRoomsAction = PayloadAction<ChatRoomWithMembers[]>;
type SetSupabaseMessagesAction = PayloadAction<{ roomId: string; messages: ChatMessageWithSender[] }>;
type AddSupabaseMessageAction = PayloadAction<{ roomId: string; message: ChatMessageWithSender }>;
type SetCurrentSupabaseRoomAction = PayloadAction<string | undefined>;

const initialState: ChatState = {
  contacts: {
    byId: {},
    allIds: [],
  },
  currentThreadId: undefined,
  threads: {
    byId: {},
    allIds: [],
  },
  // Supabase state
  supabaseRooms: {
    byId: {},
    allIds: [],
  },
  supabaseMessages: {
    byRoomId: {},
  },
  currentSupabaseRoomId: undefined,
};

const reducers = {
  getContacts(state: ChatState, action: GetContactsAction): void {
    const contacts = action.payload;

    state.contacts.byId = objFromArray(contacts);
    state.contacts.allIds = Object.keys(state.contacts.byId);
  },
  getThreads(state: ChatState, action: GetThreadsAction): void {
    const threads = action.payload;

    state.threads.byId = objFromArray(threads);
    state.threads.allIds = Object.keys(state.threads.byId);
  },
  getThread(state: ChatState, action: GetThreadAction): void {
    const thread = action.payload;

    if (thread) {
      state.threads.byId[thread.id!] = thread;

      if (!state.threads.allIds.includes(thread.id!)) {
        state.threads.allIds.unshift(thread.id!);
      }
    }
  },
  markThreadAsSeen(state: ChatState, action: MarkThreadAsSeenAction): void {
    const threadId = action.payload;
    const thread = state.threads.byId[threadId];

    if (thread) {
      thread.unreadCount = 0;
    }
  },
  setCurrentThread(state: ChatState, action: SetCurrentThreadAction): void {
    state.currentThreadId = action.payload;
  },
  addMessage(state: ChatState, action: AddMessageAction): void {
    const { threadId, message } = action.payload;
    const thread = state.threads.byId[threadId];

    if (thread) {
      thread.messages.push(message);
    }
  },
  // Supabase reducers
  setSupabaseRooms(state: ChatState, action: SetSupabaseRoomsAction): void {
    const rooms = action.payload;

    state.supabaseRooms.byId = objFromArray(rooms);
    state.supabaseRooms.allIds = Object.keys(state.supabaseRooms.byId);
  },
  setSupabaseMessages(state: ChatState, action: SetSupabaseMessagesAction): void {
    const { roomId, messages } = action.payload;

    state.supabaseMessages.byRoomId[roomId] = messages;
  },
  addSupabaseMessage(state: ChatState, action: AddSupabaseMessageAction): void {
    const { roomId, message } = action.payload;

    if (!state.supabaseMessages.byRoomId[roomId]) {
      state.supabaseMessages.byRoomId[roomId] = [];
    }

    // Check if message already exists to prevent duplicates
    const existingMessage = state.supabaseMessages.byRoomId[roomId].find(m => m.id === message.id);
    if (!existingMessage) {
      state.supabaseMessages.byRoomId[roomId].push(message);
      // Sort messages by created_at to maintain order
      state.supabaseMessages.byRoomId[roomId].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
  },
  setCurrentSupabaseRoom(state: ChatState, action: SetCurrentSupabaseRoomAction): void {
    state.currentSupabaseRoomId = action.payload;
  },
};

export const slice = createSlice({
  name: 'chat',
  initialState,
  reducers,
});

export const { reducer } = slice;
