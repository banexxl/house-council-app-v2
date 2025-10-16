import { useEffect, useState, type FC } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { usePopover } from 'src/hooks/use-popover';

import { AccountPopover } from './account-popover';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';
import { SignedAvatar } from 'src/components/signed-avatar';
import { TABLES } from 'src/libs/supabase/tables';

export const AccountButton: FC = () => {

  const popover = usePopover<HTMLButtonElement>();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabaseBrowserClient.auth.getUser();
      //Get user data from tblClients where the avatar is stored
      const { error, data: clientData } = await supabaseBrowserClient
        .from(TABLES.CLIENTS)
        .select('avatar')
        .eq('user_id', data.user?.id)
        .single();
      setUser(clientData || null);
    };
    fetchUser();
  }, []);

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
        <SignedAvatar
          value={user?.avatar}
          sx={{
            height: 32,
            width: 32,
          }}
        />
      </Box>
      <AccountPopover
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        open={popover.open}
      />
    </>
  );
};
