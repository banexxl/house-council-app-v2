import type { ChangeEvent, FC } from 'react';
import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import PlusIcon from '@untitled-ui/icons-react/build/esm/Plus';
import XIcon from '@untitled-ui/icons-react/build/esm/X';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';

import { searchBuildingUsers, type BuildingUser } from 'src/app/actions/tenant/tenant-actions';
import { Scrollbar } from 'src/components/scrollbar';
import { useMockedUser } from 'src/hooks/use-mocked-user';
import { useRouter } from 'src/hooks/use-router';
import { paths } from 'src/paths';
import { useSelector } from 'src/store';
import type { Thread } from 'src/types/chat';
import type { Tenant } from 'src/types/tenant';
import { tenantToContact, getTenantFirstName } from 'src/types/tenant';
import type { ChatRoomWithMembers } from 'src/types/chat';

import { ChatSidebarSearch } from './chat-sidebar-search';
import { ChatThreadItem } from './chat-thread-item';

const getThreadKey = (thread: Thread, userId: string): string | undefined => {
  let threadKey: string | undefined;

  if (thread.type === 'GROUP') {
    threadKey = thread.id;
  } else {
    // We hardcode the current user ID because the mocked that is not in sync
    // with the auth provider.
    // When implementing this app with a real database, replace this
    // ID with the ID from Auth Context.
    threadKey = thread.participantIds.find((participantId) => participantId !== userId);
  }

  return threadKey;
};

const useThreads = (): { byId: Record<string, Thread>; allIds: string[] } => {
  return useSelector((state) => state.chat.threads);
};

const useCurrentThreadId = (): string | undefined => {
  return useSelector((state) => state.chat.currentThreadId);
};

interface ChatSidebarProps {
  container?: HTMLElement | null;
  onClose?: () => void;
  open?: boolean;
  // New props for Supabase integration
  rooms?: ChatRoomWithMembers[];
  selectedRoom?: ChatRoomWithMembers | null;
  onRoomSelect?: (room: ChatRoomWithMembers) => void;
  onCreateRoom?: () => void;
  onSearchSelect?: (contact: Tenant) => void;
  loading?: boolean;
  // Legacy props for Redux integration
  threads?: { byId: Record<string, Thread>; allIds: string[] };
  currentThreadId?: string | null;
  onThreadSelect?: (threadId: string) => void;
}

export const ChatSidebar: FC<ChatSidebarProps> = (props) => {
  const {
    container,
    onClose,
    open,
    // New Supabase props
    rooms = [],
    selectedRoom,
    onRoomSelect,
    onCreateRoom,
    onSearchSelect,
    loading = false,
    // Legacy Redux props
    threads: propThreads,
    currentThreadId: propCurrentThreadId,
    onThreadSelect: propOnThreadSelect,
    ...other
  } = props;

  const user = useMockedUser();
  const router = useRouter();

  // Use Redux hooks only if not using Supabase props
  const reduxThreads = useThreads();
  const reduxCurrentThreadId = useCurrentThreadId();

  // Determine which system we're using
  const isSupabaseMode = rooms.length > 0 || propThreads;
  const threads = propThreads || reduxThreads;
  const currentThreadId = propCurrentThreadId || reduxCurrentThreadId;
  const onThreadSelect = propOnThreadSelect || ((threadId: string) => {
    router.push(paths.dashboard.chat + `/${threadId}`);
  });

  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Tenant[]>([]);
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  const handleCompose = useCallback((): void => {
    router.push(paths.dashboard.chat + '?compose=true');
  }, [router]);

  const handleSearchChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const { value } = event.target;

      setSearchQuery(value);

      if (!value) {
        setSearchResults([]);
        return;
      }

      try {
        // Use building users search instead of hardcoded contacts
        const result = await searchBuildingUsers(value);

        if (result.success && result.data) {
          // Convert BuildingUser to Tenant format with chat properties
          const tenants: Tenant[] = result.data.map((user: BuildingUser) => ({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            avatar_url: user.avatar || '',
            avatar: user.avatar || '',
            isActive: user.is_online || false,
            is_online: user.is_online || false,
            user_type: user.user_type,
            apartment_number: user.apartment_number,
            company_name: user.company_name,
            name: `${user.first_name} ${user.last_name}`.trim(),
            // Required tenant fields with defaults
            apartment_id: '',
            apartment: { apartment_number: user.apartment_number || '', building: { street_address: '', city: '' } },
            is_primary: false,
            move_in_date: '',
            tenant_type: 'owner' as const,
            email_opt_in: false,
            sms_opt_in: false,
            viber_opt_in: false,
            whatsapp_opt_in: false,
          }));

          setSearchResults(tenants);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('Error searching building users:', err);
        setSearchResults([]);
      }
    },
    []
  );

  const handleSearchClickAway = useCallback((): void => {
    if (searchFocused) {
      setSearchFocused(false);
      setSearchQuery('');
    }
  }, [searchFocused]);

  const handleSearchFocus = useCallback((): void => {
    setSearchFocused(true);
  }, []);

  const handleSearchSelect = useCallback(
    (contact: Tenant): void => {
      setSearchFocused(false);
      setSearchQuery('');

      if (isSupabaseMode && onSearchSelect) {
        // For Supabase mode, use the callback provided by parent
        onSearchSelect(contact);
      } else {
        // Original Redux behavior
        const threadKey = contact.id;
        router.push(paths.dashboard.chat + `?threadKey=${threadKey}`);
      }
    },
    [router, isSupabaseMode, onSearchSelect]
  );

  const handleThreadSelect = useCallback(
    (threadId: string): void => {
      const thread = threads.byId[threadId];
      const threadKey = getThreadKey(thread, user.id);

      if (!threadKey) {
        router.push(paths.dashboard.chat);
      } else {
        router.push(paths.dashboard.chat + `?threadKey=${threadKey}`);
      }
    },
    [router, threads, user]
  );

  const content = (
    <div>
      <Stack
        alignItems="center"
        direction="row"
        spacing={2}
        sx={{ p: 2 }}
      >
        <Typography
          variant="h5"
          sx={{ flexGrow: 1 }}
        >
          Chats
        </Typography>
        <Button
          onClick={isSupabaseMode && onCreateRoom ? onCreateRoom : handleCompose}
          startIcon={
            <SvgIcon>
              <PlusIcon />
            </SvgIcon>
          }
          variant="contained"
        >
          Group
        </Button>
        {!mdUp && (
          <IconButton onClick={onClose}>
            <SvgIcon>
              <XIcon />
            </SvgIcon>
          </IconButton>
        )}
      </Stack>
      <ChatSidebarSearch
        isFocused={searchFocused}
        onChange={handleSearchChange}
        onClickAway={handleSearchClickAway}
        onFocus={handleSearchFocus}
        onSelect={handleSearchSelect}
        query={searchQuery}
        results={searchResults}
      />
      <Box sx={{ display: searchFocused ? 'none' : 'block' }}>
        <Scrollbar>
          <Stack
            component="ul"
            spacing={0.5}
            sx={{
              listStyle: 'none',
              m: 0,
              p: 2,
            }}
          >
            {isSupabaseMode && rooms.length > 0 ? (
              // Render Supabase rooms
              rooms.map((room) => (
                <ChatThreadItem
                  active={selectedRoom?.id === room.id}
                  key={room.id}
                  onSelect={() => onRoomSelect?.(room)}
                  thread={{
                    id: room.id,
                    type: room.room_type === 'group' ? 'GROUP' : 'ONE_TO_ONE',
                    participantIds: room.members?.map(m => m.user_id) || [],
                    participants: room.members?.map(member => ({
                      ...member.user,
                      name: member.user ? getTenantFirstName(member.user) : 'Unknown User',
                      avatar: member.user?.avatar_url || undefined,
                      lastActivity: undefined
                    } as Tenant)) || [],
                    messages: room.last_message ? [{
                      id: room.last_message.id,
                      body: room.last_message.message_text,
                      created_at: new Date(room.last_message.created_at).getTime(),
                      authorId: room.last_message.sender_id || '',
                      contentType: room.last_message.message_type,
                      attachments: []
                    }] : [],
                    unreadCount: 0 // TODO: Calculate from read receipts
                  }}
                />
              ))
            ) : (
              // Render Redux threads
              threads.allIds.map((threadId) => (
                <ChatThreadItem
                  active={currentThreadId === threadId}
                  key={threadId}
                  onSelect={(): void => onThreadSelect(threadId)}
                  thread={threads.byId[threadId]}
                />
              ))
            )}
          </Stack>
        </Scrollbar>
      </Box>
    </div>
  );

  if (mdUp) {
    return (
      <Drawer
        anchor="left"
        open={open}
        PaperProps={{
          sx: {
            position: 'relative',
            width: 380,
          },
        }}
        SlideProps={{ container }}
        variant="persistent"
        {...other}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="left"
      hideBackdrop
      ModalProps={{
        container,
        sx: {
          pointerEvents: 'none',
          position: 'absolute',
        },
      }}
      onClose={onClose}
      open={open}
      PaperProps={{
        sx: {
          maxWidth: '100%',
          width: 380,
          pointerEvents: 'auto',
          position: 'absolute',
        },
      }}
      SlideProps={{ container }}
      variant="temporary"
      {...other}
    >
      {content}
    </Drawer>
  );
};

ChatSidebar.propTypes = {
  container: PropTypes.any,
  onClose: PropTypes.func,
  open: PropTypes.bool,
};
