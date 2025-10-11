import { useEffect, useState, type FC } from 'react';
import User01Icon from '@untitled-ui/icons-react/build/esm/User01';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import SvgIcon from '@mui/material/SvgIcon';

import { useMockedUser } from 'src/hooks/use-mocked-user';
import { usePopover } from 'src/hooks/use-popover';

import { AccountPopover } from './account-popover';
import { supabaseBrowserClient } from 'src/libs/supabase/sb-client';

export const AccountButton: FC = () => {

  const popover = usePopover<HTMLButtonElement>();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabaseBrowserClient.auth.getUser();
      //Get user data from tblClients where the avatar is stored
      const { error, data: clientData } = await supabaseBrowserClient
        .from('tblClients')
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
        <Avatar
          sx={{
            height: 32,
            width: 32,
          }}
          src={user?.avatar}
        >
          <SvgIcon>
            <User01Icon />
          </SvgIcon>
        </Avatar>
      </Box>
      <AccountPopover
        anchorEl={popover.anchorRef.current}
        onClose={popover.handleClose}
        open={popover.open}
      />
    </>
  );
};
