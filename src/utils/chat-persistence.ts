/**
 * Simple persistence layer for chat data using localStorage
 * This prevents messages from disappearing when switching tabs
 */

export interface PersistedChatRoom {
     id: string;
     data: any;
     timestamp: number;
}

export interface PersistedChatMessages {
     roomId: string;
     messages: any[];
     timestamp: number;
}

const STORAGE_KEYS = {
     CHAT_ROOMS: 'chat_rooms',
     CHAT_MESSAGES: 'chat_messages',
} as const;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Save chat rooms to localStorage
 */
export const saveChatRooms = (rooms: any[]): void => {
     try {
          const data: PersistedChatRoom[] = rooms.map(room => ({
               id: room.id,
               data: room,
               timestamp: Date.now()
          }));
          localStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(data));
     } catch (error) {
          console.warn('Failed to save chat rooms to localStorage:', error);
     }
};

/**
 * Load chat rooms from localStorage
 */
export const loadChatRooms = (): any[] => {
     try {
          const stored = localStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
          if (!stored) return [];

          const data: PersistedChatRoom[] = JSON.parse(stored);
          const now = Date.now();

          // Filter out expired data
          const validRooms = data.filter(item => (now - item.timestamp) < CACHE_DURATION);

          return validRooms.map(item => item.data);
     } catch (error) {
          console.warn('Failed to load chat rooms from localStorage:', error);
          return [];
     }
};

/**
 * Save messages for a specific room to localStorage
 */
export const saveChatMessages = (roomId: string, messages: any[]): void => {
     try {
          const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
          const allMessages: PersistedChatMessages[] = stored ? JSON.parse(stored) : [];

          // Remove existing messages for this room
          const filteredMessages = allMessages.filter(item => item.roomId !== roomId);

          // Add new messages
          filteredMessages.push({
               roomId,
               messages,
               timestamp: Date.now()
          });

          localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(filteredMessages));
     } catch (error) {
          console.warn('Failed to save chat messages to localStorage:', error);
     }
};

/**
 * Load messages for a specific room from localStorage
 */
export const loadChatMessages = (roomId: string): any[] => {
     try {
          const stored = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
          if (!stored) return [];

          const allMessages: PersistedChatMessages[] = JSON.parse(stored);
          const now = Date.now();

          // Find messages for this room that haven't expired
          const roomMessages = allMessages.find(item =>
               item.roomId === roomId && (now - item.timestamp) < CACHE_DURATION
          );

          return roomMessages ? roomMessages.messages : [];
     } catch (error) {
          console.warn('Failed to load chat messages from localStorage:', error);
          return [];
     }
};

/**
 * Clear all cached chat data
 */
export const clearChatCache = (): void => {
     try {
          localStorage.removeItem(STORAGE_KEYS.CHAT_ROOMS);
          localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
     } catch (error) {
          console.warn('Failed to clear chat cache:', error);
     }
};

/**
 * Clear expired data from localStorage
 */
export const cleanupExpiredData = (): void => {
     try {
          const now = Date.now();

          // Clean up rooms
          const storedRooms = localStorage.getItem(STORAGE_KEYS.CHAT_ROOMS);
          if (storedRooms) {
               const rooms: PersistedChatRoom[] = JSON.parse(storedRooms);
               const validRooms = rooms.filter(item => (now - item.timestamp) < CACHE_DURATION);
               localStorage.setItem(STORAGE_KEYS.CHAT_ROOMS, JSON.stringify(validRooms));
          }

          // Clean up messages
          const storedMessages = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
          if (storedMessages) {
               const messages: PersistedChatMessages[] = JSON.parse(storedMessages);
               const validMessages = messages.filter(item => (now - item.timestamp) < CACHE_DURATION);
               localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(validMessages));
          }
     } catch (error) {
          console.warn('Failed to cleanup expired data:', error);
     }
};