import type { FC, MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import type SimpleBarCore from 'simplebar-core';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

import { getParticipants } from 'src/app/actions/chat/chat-actions';
import { Scrollbar } from 'src/components/scrollbar';
import { useMockedUser } from 'src/hooks/use-mocked-user';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { useDispatch, useSelector } from 'src/store';
import { thunks } from 'src/thunks/chat';
import type { Participant, Thread, Message } from 'src/types/chat';
import type { User } from 'src/types/user';

import { ChatMessageAdd } from './chat-message-add';
import { ChatMessages } from './chat-messages';
import { ChatThreadToolbar } from './chat-thread-toolbar';

const useParticipants = (threadKey: string): Participant[] => {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);

  const handleParticipantsGet = useCallback(async (): Promise<void> => {
    try {
      const response = await getParticipants(threadKey);
      if (response.success && response.data) {
        setParticipants(response.data);
      }
    } catch (err) {
      console.error(err);
      router.push(paths.dashboard.chat);
    }
  }, [router, threadKey]);

  useEffect(
    () => {
      handleParticipantsGet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threadKey]
  );

  return participants;
};

const useThread = (threadKey: string): Thread | undefined => {
  const router = useRouter();
  const dispatch = useDispatch();
  const thread = useSelector((state) => {
    const { threads, currentThreadId } = state.chat;

    return threads.byId[currentThreadId as string];
  });

  const handleThreadGet = useCallback(async (): Promise<void> => {
    // If thread key is not a valid key (thread id or contact id)
    // the server throws an error, this means that the user tried a shady route
    // and we redirect them on the home view

    let threadId: string | undefined;

    try {
      threadId = (await dispatch(
        thunks.getThread({
          threadKey,
        })
      )) as unknown as string | undefined;
    } catch (err) {
      console.error(err);
      router.push(paths.dashboard.chat);
      return;
    }

    // Set the active thread
    // If the thread exists, then is sets it as active, otherwise it sets is as undefined

    dispatch(
      thunks.setCurrentThread({
        threadId,
      })
    );

    // Mark the thread as seen only if it exists

    if (threadId) {
      dispatch(
        thunks.markThreadAsSeen({
          threadId,
        })
      );
    }
  }, [router, dispatch, threadKey]);

  useEffect(
    () => {
      handleThreadGet();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threadKey]
  );

  return thread;
};

const useMessagesScroll = (
  thread?: Thread,
  messages?: Message[]
): {
  messagesRef: MutableRefObject<SimpleBarCore | null>;
} => {
  const messagesRef = useRef<SimpleBarCore | null>(null);
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  const scrollToBottom = useCallback((force = false) => {
    if (!messagesRef.current) {
      return;
    }

    const scrollElement = messagesRef.current.getScrollElement();

    if (scrollElement) {
      if (force) {
        // Force scroll to bottom (initial load)
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
          setHasInitialScrolled(true);
          console.log('📜 Initial scroll to bottom completed', {
            scrollTop: scrollElement.scrollTop,
            scrollHeight: scrollElement.scrollHeight,
            clientHeight: scrollElement.clientHeight
          });
        }, 100);
      } else {
        // For regular updates, be more aggressive about scrolling
        // Check if user was near the bottom (increased threshold)
        const wasNearBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 200;

        // Auto-scroll if user was reasonably near the bottom
        if (wasNearBottom) {
          // Use requestAnimationFrame for smoother scrolling
          requestAnimationFrame(() => {
            scrollElement.scrollTop = scrollElement.scrollHeight;
            console.log('📜 Auto-scrolled to bottom (new message)', {
              wasNearBottom,
              finalScrollTop: scrollElement.scrollTop,
              scrollHeight: scrollElement.scrollHeight
            });
          });
        } else {
          console.log('📜 User scrolled up, not auto-scrolling', {
            scrollTop: scrollElement.scrollTop,
            clientHeight: scrollElement.clientHeight,
            scrollHeight: scrollElement.scrollHeight,
            distanceFromBottom: scrollElement.scrollHeight - (scrollElement.scrollTop + scrollElement.clientHeight)
          });
        }
      }
    }
  }, []);

  const handleUpdate = useCallback((): void => {
    console.log('📜 handleUpdate called:', {
      thread: !!thread,
      messages: messages?.length,
      hasInitialScrolled,
      messagesRefCurrent: !!messagesRef.current
    });

    // Thread does not exist
    if (!thread && !messages) {
      console.log('📜 No thread and no messages, skipping scroll');
      return;
    }

    // Initial scroll to bottom when messages first load
    if (!hasInitialScrolled && messages && messages.length > 0) {
      console.log('📜 Initial scroll triggered, messages count:', messages.length);
      scrollToBottom(true);
      return;
    }

    // Regular update scroll behavior
    console.log('📜 Regular scroll triggered, messages count:', messages?.length);
    scrollToBottom(false);
  }, [thread, messages, hasInitialScrolled, scrollToBottom]);

  useEffect(
    () => {
      handleUpdate();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thread, messages?.length, hasInitialScrolled] // Track messages.length instead of messages object reference
  );

  return {
    messagesRef,
  };
};

interface ChatThreadProps {
  threadKey: string;
  messages?: Message[];
  participants?: Participant[];
  currentUser?: User;
  onSendMessage?: (body: string) => Promise<void>;
}

export const ChatThread: FC<ChatThreadProps> = (props) => {
  console.log('props.messages', props.messages);

  const { threadKey, messages: messagesProp, participants: participantsProp, currentUser, onSendMessage, ...other } = props;
  const dispatch = useDispatch();
  const user = useMockedUser();
  const thread = useThread(threadKey);
  const participantsFromHook = useParticipants(threadKey);

  // Use props if provided, otherwise fall back to thread data
  const messages = messagesProp || thread?.messages || [];
  const participants = participantsProp || participantsFromHook || thread?.participants || [];

  console.log('💬 ChatThread Debug:', {
    messagesProp: messagesProp?.length,
    threadMessages: thread?.messages?.length,
    finalMessages: messages.length,
    participants: participants.length,
    currentUser: currentUser?.id || user?.id
  });

  const { messagesRef } = useMessagesScroll(thread, messages);

  // Keep track of the previous message count to detect new messages
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true); // Track if user is near bottom

  // Track scroll position to know if user is near bottom
  useEffect(() => {
    const checkScrollPosition = () => {
      if (messagesRef.current) {
        const scrollElement = messagesRef.current.getScrollElement();
        if (scrollElement) {
          const isNearBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 150;
          isNearBottomRef.current = isNearBottom;
        }
      }
    };

    // Check immediately
    checkScrollPosition();

    // Add scroll listener to track position
    if (messagesRef.current) {
      const scrollElement = messagesRef.current.getScrollElement();
      if (scrollElement) {
        scrollElement.addEventListener('scroll', checkScrollPosition);
        return () => {
          scrollElement.removeEventListener('scroll', checkScrollPosition);
        };
      }
    }
  }, [messagesRef.current]);

  // Enhanced effect specifically for Supabase message updates with better scroll detection
  useEffect(() => {
    if (messagesProp && messagesProp.length > 0) {
      const currentCount = messagesProp.length;
      const prevCount = prevMessageCountRef.current;

      console.log('📜 Supabase messages updated:', {
        currentCount,
        prevCount,
        isNearBottom: isNearBottomRef.current,
        difference: currentCount - prevCount
      });

      // If we have new messages and user was near bottom
      if (currentCount > prevCount && (isNearBottomRef.current || prevCount === 0)) {
        console.log('📜 New message detected, forcing scroll to bottom');

        // Use requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (messagesRef.current) {
              const scrollElement = messagesRef.current.getScrollElement();
              if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
                console.log('📜 Forced scroll completed:', {
                  scrollTop: scrollElement.scrollTop,
                  scrollHeight: scrollElement.scrollHeight
                });
              }
            }
          }, 50);
        });
      } else if (currentCount > prevCount) {
        console.log('📜 New message received but user scrolled up, not auto-scrolling');
      }

      // Update the previous count
      prevMessageCountRef.current = currentCount;
    }
  }, [messagesProp?.length, messagesRef]);

  // Listen for real-time message events to force scroll
  useEffect(() => {
    const handleNewRealtimeMessage = (event: CustomEvent) => {
      const { roomId: eventRoomId } = event.detail;

      // Only handle events for the current thread
      if (eventRoomId === threadKey) {
        console.log('🔄 Real-time message event received, forcing scroll');

        // Force scroll to bottom with multiple strategies
        const forceScroll = () => {
          if (messagesRef.current) {
            const scrollElement = messagesRef.current.getScrollElement();
            if (scrollElement) {
              // Strategy 1: Direct scroll to bottom
              scrollElement.scrollTop = scrollElement.scrollHeight;

              // Strategy 2: Find last message element and scroll into view
              const lastMessage = scrollElement.querySelector('[data-message]:last-child');
              if (lastMessage) {
                lastMessage.scrollIntoView({ behavior: 'auto', block: 'end' });
              }

              console.log('🔄 Forced scroll after real-time message:', {
                scrollTop: scrollElement.scrollTop,
                scrollHeight: scrollElement.scrollHeight,
                strategy: lastMessage ? 'scrollIntoView + direct' : 'direct only'
              });
            }
          }
        };

        // Try multiple times with increasing delays to ensure it works
        setTimeout(forceScroll, 100);
        setTimeout(forceScroll, 300);
      }
    };

    window.addEventListener('newRealtimeMessage', handleNewRealtimeMessage as EventListener);

    return () => {
      window.removeEventListener('newRealtimeMessage', handleNewRealtimeMessage as EventListener);
    };
  }, [threadKey, messagesRef]);

  const handleSend = useCallback(
    async (body: string): Promise<void> => {
      // Use custom onSendMessage if provided (for Supabase chat)
      if (onSendMessage) {
        try {
          await onSendMessage(body);
        } catch (err) {
          console.error(err);
        }
        return;
      }

      // Otherwise use the legacy Redux-based approach
      // If we have the thread, we use its ID to add a new message
      if (thread) {
        try {
          await dispatch(
            thunks.addMessage({
              threadId: thread.id,
              body,
            })
          );
        } catch (err) {
          console.error(err);
        }

        return;
      }

      // Otherwise we use the recipients IDs. When using participant IDs, it means that we have to
      // get the thread.

      // Filter the current user to get only the other participants

      const recipientIds = participants
        .filter((participant) => participant.id !== user.id)
        .map((participant) => participant.id);

      // Add the new message

      let threadId: string;

      try {
        threadId = (await dispatch(
          thunks.addMessage({
            recipientIds,
            body,
          })
        )) as unknown as string;
      } catch (err) {
        console.error(err);
        return;
      }

      // Load the thread because we did not have it

      try {
        await dispatch(
          thunks.getThread({
            threadKey: threadId,
          })
        );
      } catch (err) {
        console.error(err);
        return;
      }

      // Set the new thread as active

      dispatch(thunks.setCurrentThread({ threadId }));
    },
    [dispatch, participants, thread, user, onSendMessage]
  );

  // Maybe implement a loading state

  return (
    <Stack
      sx={{
        flexGrow: 1,
        overflow: 'hidden',
        height: '100%', // Ensure full height
      }}
      {...other}
    >
      <ChatThreadToolbar participants={participants} />
      <Divider />
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          height: 0, // This ensures proper flex behavior
          minHeight: 300, // Minimum height for debugging
        }}
      >
        <Box
          ref={(el) => {
            if (el && messagesRef.current === null) {
              // Create a simple ref that mimics SimpleBarCore interface for compatibility
              messagesRef.current = {
                getScrollElement: () => el,
                el: el
              } as SimpleBarCore;
            }
          }}
          sx={{
            height: '100%',
            overflow: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ChatMessages
            messages={messages}
            participants={participants}
            currentUser={currentUser}
          />
        </Box>
      </Box>
      <Divider />
      <ChatMessageAdd onSend={handleSend} />
    </Stack>
  );
};

ChatThread.propTypes = {
  threadKey: PropTypes.string.isRequired,
  messages: PropTypes.array,
  participants: PropTypes.array,
  currentUser: PropTypes.any,
  onSendMessage: PropTypes.func,
};
