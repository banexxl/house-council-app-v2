import type { FC } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import ArrowRightIcon from '@untitled-ui/icons-react/build/esm/ArrowRight';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { Grid } from '@mui/material';;
import Stack from '@mui/material/Stack';
import SvgIcon from '@mui/material/SvgIcon';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { Scrollbar } from 'src/components/scrollbar';
import { DeleteAccountSection } from './account-delete-section';
import { Client } from 'src/types/client';
import PasswordReset from './account-security-password-reset';
import { User } from '@supabase/supabase-js';

interface LoginEvent {
  id: string;
  created_at: number;
  ip: string;
  type: string;
  userAgent: string;
}

interface AccountSecuritySettingsProps {
  loginEvents: LoginEvent[];
  client: Client;
  userData: User;
}

export const AccountSecuritySettings: FC<AccountSecuritySettingsProps> = (props) => {

  const { loginEvents, client, userData } = props;


  return (
    <Stack spacing={4}>
      <Card>
        <CardContent>
          <Grid
            container
            spacing={3}
          >

            <PasswordReset userData={{ client, session: userData }} />

          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          title="Login history"
          subheader="Your recent login activity"
        />
        <Scrollbar>
          <Table sx={{ minWidth: 500 }}>
            <TableHead>
              <TableRow>
                <TableCell>Login type</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Client</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loginEvents.map((event) => {
                const created_at = format(event.created_at, 'HH:mm a MM/dd/yyyy');

                return (
                  <TableRow
                    key={event.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">{event.type}</Typography>
                      <Typography
                        variant="body2"
                        color="body2"
                      >
                        on {created_at}
                      </Typography>
                    </TableCell>
                    <TableCell>{event.ip}</TableCell>
                    <TableCell>{event.userAgent}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Scrollbar>
      </Card>
      <Card sx={{ p: 3, mt: 2 }}>
        <DeleteAccountSection id={client.id} />
      </Card>
    </Stack>
  );
};

AccountSecuritySettings.propTypes = {
  loginEvents: PropTypes.array.isRequired,
};
