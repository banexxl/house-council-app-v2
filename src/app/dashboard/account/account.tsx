'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { AccountBillingSettings } from 'src/sections/dashboard/account/account-billing-settings';
import { AccountGeneralSettings } from 'src/sections/dashboard/account/account-general-settings';
import { AccountNotificationsSettings } from 'src/sections/dashboard/account/account-notifications-settings';
import { AccountTeamSettings } from 'src/sections/dashboard/account/account-team-settings';
import { AccountSecuritySettings } from 'src/sections/dashboard/account/account-security-settings';
import { Client, ClientMember } from 'src/types/client';
import { SubscriptionPlan } from 'src/types/subscription-plan';
import { ClientBillingInformation } from 'src/types/client-billing-information';
import { Invoice } from 'src/types/payment';
import { User } from '@supabase/supabase-js';
import { ServerLog } from 'src/libs/supabase/server-logging';

const tabs = [
     { label: 'General', value: 'general' },
     { label: 'Billing', value: 'billing' },
     { label: 'Team', value: 'team' },
     { label: 'Notifications', value: 'notifications' },
     { label: 'Security', value: 'security' },
];

export interface AccountProps {
     client: Client;
     userData: User;
     clientSubscriptionPlan: SubscriptionPlan | null;
     clientBillingInfo: ClientBillingInformation[] | null;
     clientInvoices: Invoice[] | undefined | null;
     subscriptionPlans: SubscriptionPlan[] | null;
     allTeamMembers: ClientMember[] | null;
     clientLogs: ServerLog[] | null;
}

const Account = ({ client, userData, clientSubscriptionPlan, clientBillingInfo, clientInvoices, subscriptionPlans, allTeamMembers, clientLogs }: AccountProps) => {
     const [currentTab, setCurrentTab] = useState<string>('general');

     const handleTabsChange = useCallback((event: ChangeEvent<any>, value: string): void => {
          setCurrentTab(value);
     }, []);

     return (
          <>
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
                                   plan={clientSubscriptionPlan?.id!}
                                   invoices={clientInvoices}
                                   billingInfo={clientBillingInfo}
                                   subscriptionPlans={subscriptionPlans}
                              />
                         )}
                         {currentTab === 'team' && (
                              <AccountTeamSettings members={allTeamMembers || []} client={client} />
                         )}
                         {currentTab === 'notifications' && <AccountNotificationsSettings />}
                         {currentTab === 'security' && (
                              <AccountSecuritySettings loginEvents={clientLogs || []} client={client} userData={userData} />
                         )}
                    </Container>
               </Box>
          </>
     );
};

export default Account;
