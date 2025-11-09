import {
  getContacts as getContactsAction,
  getThreads as getThreadsAction,
  getThread as getThreadAction,
  markThreadAsSeen as markThreadAsSeenAction,
  addMessage as addMessageAction,
  getUserChatRooms,
  getRoomMessages,
} from 'src/app/actions/chat/chat-actions';
import { slice } from 'src/slices/chat';
import type { AppThunk } from 'src/store';
import type { ChatRoomWithMembers, ChatMessageWithSender } from 'src/types/chat';

const getContacts =
  (): AppThunk =>
    async (dispatch): Promise<void> => {
      const response = await getContactsAction();

      if (response.success && response.data) {
        dispatch(slice.actions.getContacts(response.data));
      }
    };

const getThreads =
  (): AppThunk =>
    async (dispatch): Promise<void> => {
      const response = await getThreadsAction();

      if (response.success && response.data) {
        dispatch(slice.actions.getThreads(response.data));
      }
    };

type GetThreadParams = {
  threadKey: string;
};

const getThread =
  (params: GetThreadParams): AppThunk =>
    async (dispatch): Promise<string | undefined> => {
      const response = await getThreadAction(params.threadKey);

      if (response.success && response.data) {
        dispatch(slice.actions.getThread(response.data));
        return response.data.id;
      }

      return undefined;
    };

type MarkThreadAsSeenParams = {
  threadId: string;
};

const markThreadAsSeen =
  (params: MarkThreadAsSeenParams): AppThunk =>
    async (dispatch): Promise<void> => {
      const response = await markThreadAsSeenAction(params.threadId);

      if (response.success) {
        dispatch(slice.actions.markThreadAsSeen(params.threadId));
      }
    };

type SetCurrentThreadParams = {
  threadId?: string;
};

const setCurrentThread =
  (params: SetCurrentThreadParams): AppThunk =>
    (dispatch): void => {
      dispatch(slice.actions.setCurrentThread(params.threadId));
    };

type AddMessageParams = {
  threadId?: string;
  recipientIds?: string[];
  body: string;
};

const addMessage =
  (params: AddMessageParams): AppThunk =>
    async (dispatch): Promise<string> => {
      const response = await addMessageAction({
        threadId: params.threadId,
        recipientIds: params.recipientIds,
        body: params.body
      });

      if (response.success && response.data) {
        dispatch(slice.actions.addMessage(response.data));
        return response.data.threadId;
      }

      return '';
    };

// Supabase thunks
const getSupabaseRooms =
  (): AppThunk =>
    async (dispatch): Promise<void> => {
      try {
        const response = await getUserChatRooms();

        if (response.success && response.data) {
          dispatch(slice.actions.setSupabaseRooms(response.data));
        }
      } catch (error) {
        console.error('Error fetching Supabase rooms:', error);
      }
    };

type GetSupabaseMessagesParams = {
  roomId: string;
};

const getSupabaseMessages =
  (params: GetSupabaseMessagesParams): AppThunk =>
    async (dispatch): Promise<void> => {
      try {
        const response = await getRoomMessages(params.roomId);

        if (response.success && response.data) {
          dispatch(slice.actions.setSupabaseMessages({
            roomId: params.roomId,
            messages: response.data
          }));
        }
      } catch (error) {
        console.error('Error fetching Supabase messages:', error);
      }
    };

type AddSupabaseMessageParams = {
  roomId: string;
  message: ChatMessageWithSender;
};

const addSupabaseMessage =
  (params: AddSupabaseMessageParams): AppThunk =>
    (dispatch): void => {
      dispatch(slice.actions.addSupabaseMessage(params));
    };

type SetCurrentSupabaseRoomParams = {
  roomId?: string;
};

const setCurrentSupabaseRoom =
  (params: SetCurrentSupabaseRoomParams): AppThunk =>
    (dispatch): void => {
      dispatch(slice.actions.setCurrentSupabaseRoom(params.roomId));
    };

export const thunks = {
  addMessage,
  getContacts,
  getThread,
  getThreads,
  markThreadAsSeen,
  setCurrentThread,
  // Supabase thunks
  getSupabaseRooms,
  getSupabaseMessages,
  addSupabaseMessage,
  setCurrentSupabaseRoom,
};
