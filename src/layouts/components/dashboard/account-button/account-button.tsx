import { useEffect, useState, type FC } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import { usePopover } from 'src/hooks/use-popover';

import { AccountPopover } from './account-popover';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { SignedAvatar } from 'src/components/signed-avatar';
import { TABLES } from 'src/libs/supabase/tables';
import { getViewer } from 'src/libs/supabase/server-auth';
import { getInitials } from 'src/utils/get-initials';
import log from 'src/utils/logger';

export const AccountButton: FC = () => {

  const popover = usePopover<HTMLButtonElement>();

  const [user, setUser] = useState<{
    role: 'tenant' | 'client' | 'clientMember' | 'admin' | 'unknown';
    id?: string;
    email?: string;
    avatar?: string | null;
    name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { client, clientMember, tenant, admin, userData } = await getViewer();

      // Tenant view: prefer direct Supabase avatar URL, fall back to initials
      if (tenant) {
        const { data: profileData, error } = await supabaseBrowserClient
          .from(TABLES.TENANT_PROFILES)
          .select('avatar_url, id, email, first_name, last_name')
          .eq('tenant_id', tenant.id)
          .single();
        log(`tenant profile data: ${JSON.stringify(profileData)}, error: ${JSON.stringify(error)}`);
        setUser({
          role: 'tenant',
          id: profileData?.id ?? tenant.id,
          email: profileData?.email ?? tenant.email ?? userData?.email ?? undefined,
          avatar: profileData?.avatar_url ?? tenant.avatar_url ?? null,
          name: `${profileData?.first_name ?? tenant.first_name ?? ''} ${profileData?.last_name ?? tenant.last_name ?? ''}`.trim(),
        });
        return;
      }

      if (client) {
        setUser({
          role: 'client',
          id: client.id,
          email: client.email ?? userData?.email ?? undefined,
          avatar: client.avatar,
          name: client.name,
        });
        return;
      }

      if (clientMember) {
        setUser({
          role: 'clientMember',
          id: clientMember.id,
          email: clientMember.email ?? userData?.email ?? undefined,
        });
        return;
      }

      if (admin) {
        setUser({
          role: 'admin',
          id: admin.id,
          email: admin.email ?? userData?.email ?? undefined,
        });
        return;
      }

      setUser({
        role: 'unknown',
        email: userData?.email ?? undefined,
      });
    };
    fetchUser().finally(() => setLoading(false));
  }, []);

  const tenantAvatar = user?.role === 'tenant' ? (
    <Avatar
      src={user.avatar || undefined}
      alt={user?.name || user?.email || 'User'}
      sx={{
        height: 32,
        width: 32,
      }}
    >
      {getInitials(user?.name || user?.email || 'User')}
    </Avatar>
  ) : null;

  return (
    <>
      <Box
        component={ButtonBase}
        onClick={popover.handleOpen}
        ref={popover.anchorRef}
      sx={{
        alignItems: 'center',
        display: 'flex',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'divider',
        height: 40,
        width: 40,
        borderRadius: '50%',
      }}
      >
        {loading ? (
          <CircularProgress size={20} thickness={5} />
        ) : (
          tenantAvatar ?? (
            <SignedAvatar
              value={user?.avatar}
              sx={{
                height: 32,
                width: 32,
              }}
            />
          )
        )}
      </Box>
      <AccountPopover
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        open={popover.open}
      />
    </>
  );
};
