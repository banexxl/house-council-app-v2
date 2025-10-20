import type { FC } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import { Grid } from '@mui/material';;
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Client } from 'src/types/client';

interface AccountNotificationsSettingsProps {
  client: Client;
}

export const AccountNotificationsSettings: FC<AccountNotificationsSettingsProps> = ({ client }) => (



  <Card>
    <CardContent>
      <Grid
        container
        spacing={3}
      >
        <Grid
          size={{ xs: 12, md: 4 }}
        >
          <Typography variant="h6">Consent</Typography>
        </Grid>
        <Grid
          size={{ xs: 12, md: 8 }}
        >
          <Stack
            divider={<Divider />}
            spacing={3}
          >
            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">Accepted Terms & Conditions</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Indicates the user accepted the latest Terms & Conditions.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.has_accepted_terms_and_conditions)} />
            </Stack>

            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">Accepted Privacy Policy</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Confirms the user agreed to the Privacy Policy.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.has_accepted_privacy_policy)} />
            </Stack>

            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">Accepted Marketing</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Allows receiving marketing content and promotions.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.has_accepted_marketing)} />
            </Stack>

            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">Verified Account</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Marks the client as verified.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.is_verified)} />
            </Stack>
          </Stack>
        </Grid>
      </Grid>
      <Divider sx={{ my: 3 }} />
      <Grid
        container
        spacing={3}
      >
        <Grid
          size={{ xs: 12, md: 4 }}
        >
          <Typography variant="h6">Communication Opt-ins</Typography>
        </Grid>
        <Grid
          size={{ xs: 12, md: 8 }}
        >
          <Stack
            divider={<Divider />}
            spacing={3}
          >
            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">Email</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Opt in to receive emails.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.email_opt_in)} />
            </Stack>

            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">SMS</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Opt in to receive SMS messages.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.sms_opt_in)} />
            </Stack>

            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">Viber</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Opt in to receive Viber messages.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.viber_opt_in)} />
            </Stack>

            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={3}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle1">WhatsApp</Typography>
                <Typography
                  color="text.secondary"
                  variant="body2"
                >
                  Opt in to receive WhatsApp messages.
                </Typography>
              </Stack>
              <Switch defaultChecked={Boolean(client.whatsapp_opt_in)} />
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);
