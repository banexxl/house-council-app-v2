import type { FC } from 'react';
import Stack from '@mui/material/Stack';
import { PolarCustomer } from 'src/types/polar-customer-types';
import { ClientForm } from '../client/client-form';

interface AccountGeneralSettingsProps {
     customer: PolarCustomer
}

export const AccountGeneralSettings: FC<AccountGeneralSettingsProps> = ({ customer }) => {

     return (
          <Stack spacing={2}>
               <ClientForm clientData={customer} />
          </Stack>
     );
};
