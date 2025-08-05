'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { Seo } from 'src/components/seo';
import { AccountBillingSettings } from 'src/sections/dashboard/account/account-billing-settings';
import { AccountGeneralSettings } from 'src/sections/dashboard/account/account-general-settings';
import { AccountNotificationsSettings } from 'src/sections/dashboard/account/account-notifications-settings';
import { AccountTeamSettings } from 'src/sections/dashboard/account/account-team-settings';
import { AccountSecuritySettings } from 'src/sections/dashboard/account/account-security-settings';
import { Client } from 'src/types/client';

const now = new Date();

const tabs = [
     { label: 'General', value: 'general' },
     { label: 'Billing', value: 'billing' },
     { label: 'Team', value: 'team' },
     { label: 'Notifications', value: 'notifications' },
     { label: 'Security', value: 'security' },
];

export interface AccountProps {
     client: Client
}

const Account = ({ client }: AccountProps) => {
     const [currentTab, setCurrentTab] = useState<string>('general');

     const handleTabsChange = useCallback((event: ChangeEvent<any>, value: string): void => {
          setCurrentTab(value);
     }, []);

     return (
          <>
               <Seo title="Dashboard: Account" />
               <Box
                    component="main"
                    sx={{
                         flexGrow: 1,
                         py: 8,
                    }}
               >
                    <Container maxWidth="xl">
                         <Stack spacing={3} sx={{ mb: 3 }}>
                              <Typography variant="h4">Account</Typography>
                              <div>
                                   <Tabs
                                        indicatorColor="primary"
                                        onChange={handleTabsChange}
                                        scrollButtons="auto"
                                        textColor="primary"
                                        value={currentTab}
                                        variant="scrollable"
                                   >
                                        {tabs.map((tab) => (
                                             <Tab key={tab.value} label={tab.label} value={tab.value} />
                                        ))}
                                   </Tabs>
                                   <Divider />
                              </div>
                         </Stack>
                         {currentTab === 'general' && (
                              <AccountGeneralSettings
                                   client={client}
                              />
                         )}
                         {currentTab === 'billing' && (
                              <AccountBillingSettings
                                   plan="standard"
                                   invoices={[]}
                              />
                         )}
                         {currentTab === 'team' && (
                              <AccountTeamSettings members={[]} />
                         )}
                         {currentTab === 'notifications' && <AccountNotificationsSettings />}
                         {currentTab === 'security' && (
                              <AccountSecuritySettings loginEvents={[]} />
                         )}
                    </Container>
               </Box>
          </>
     );
};

export default Account;
