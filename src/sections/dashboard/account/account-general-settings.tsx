import type { FC } from 'react';
import Stack from '@mui/material/Stack';
import { ClientForm } from 'src/sections/dashboard/client/client-form';
import { DeleteAccountSection } from './account-delete-section';
import { Card } from '@mui/material';
import { Client } from 'src/types/client';

interface AccountGeneralSettingsProps {
  client: Client
}

export const AccountGeneralSettings: FC<AccountGeneralSettingsProps> = ({ client }) => {

  return (
    <Stack spacing={2}>
      <ClientForm clientData={client} />
      <Card sx={{ p: 3, mt: 2 }}>
        <DeleteAccountSection id={client.id} />
      </Card>
    </Stack>
  );
};


