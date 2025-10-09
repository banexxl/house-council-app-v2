import { useTranslation } from 'react-i18next';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { Grid, Box } from '@mui/material';;
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { DeleteAccountSection } from './account-delete-section';
import { Client } from 'src/types/client';
import PasswordReset from './account-security-password-reset';
import { User } from '@supabase/supabase-js';
import { ServerLog } from 'src/libs/supabase/server-logging';

interface AccountSecuritySettingsProps {
  loginEvents: ServerLog[];
  client: Client;
  userData: User;
}

export const AccountSecuritySettings: FC<AccountSecuritySettingsProps> = (props) => {

  const { t } = useTranslation();

  const { loginEvents, client, userData } = props;
  // In-memory cache for IP locations (per session)
  const ipLocationCache: Record<string, string> = {};

  function useIpLocation(ip: string): string {
    const [location, setLocation] = useState<string>(() => ipLocationCache[ip] || 'Loading...');
    const isMounted = useRef(true);
    useEffect(() => {
      isMounted.current = true;
      if (!ip) return setLocation('Unknown');
      if (ipLocationCache[ip]) {
        setLocation(ipLocationCache[ip]);
        return;
      }
      fetch(`/api/ip/get-location?ip=${ip}`)
        .then(res => res.json())
        .then(data => {
          let loc = 'Unknown';
          if (data && data.city && data.country_name) {
            loc = `${data.city}, ${data.country_name}`;
          } else if (data && data.country_name) {
            loc = data.country_name;
          }
          ipLocationCache[ip] = loc;
          if (isMounted.current) setLocation(loc);
        })
        .catch(() => {
          ipLocationCache[ip] = 'Unknown';
          if (isMounted.current) setLocation('Unknown');
        });
      return () => { isMounted.current = false; };
    }, [ip]);
    return location;
  }


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
          title={t('account.security.loginHistoryTitle')}
          subheader={t('account.security.loginHistorySubtitle')}
        />
        <Box sx={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('account.security.loginHistoryTime')}</TableCell>
                <TableCell>{t('account.security.loginHistoryIp')}</TableCell>
                <TableCell>{t('account.security.loginHistoryLocation')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                loginEvents.length > 0 ?
                  loginEvents.map((event) => {
                    const created_at = format(new Date(event.created_at!), 'HH:mm a MM/dd/yyyy');
                    const location = useIpLocation(event.payload.ip);
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
                        <TableCell>{event.payload.ip}</TableCell>
                        <TableCell>{location}</TableCell>
                      </TableRow>
                    );

                  })
                  :
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      {t('account.security.noLoginEvents')}
                    </TableCell>
                  </TableRow>
              }
            </TableBody>
          </Table>
        </Box>
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
