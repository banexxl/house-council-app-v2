'use client';

import type { ChangeEvent } from 'react';
import { use, useCallback, useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';


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

     const { t } = useTranslation();
     const [currentTab, setCurrentTab] = useState<string>('general');

     const handleTabsChange = useCallback((event: ChangeEvent<any>, value: string): void => {
          setCurrentTab(value);
     }, []);

     const tabs = [
          { label: t('account.lblGeneral'), value: 'general' },
          { label: t('account.lblBilling'), value: 'billing' },
          { label: t('account.lblTeam'), value: 'team' },
          { label: t('account.lblNotifications'), value: 'notifications' },
          { label: t('account.lblSecurity'), value: 'security' },
     ];

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
                         <Typography variant="h4" sx={{ mb: 2 }}>{t('nav.account')}</Typography>
                         <Box
                              sx={{
                                   display: 'grid',
                                   gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
                                   gap: 3
                              }}
                         >
                              {/* Vertical Tabs for md+ */}
                              <Box
                                   sx={{
                                        display: { xs: 'none', md: 'flex' },
                                        flexDirection: 'column',
                                        position: 'sticky',
                                        top: (theme) => theme.spacing(9),
                                        alignSelf: 'start',
                                        height: 'fit-content',
                                        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                                        pr: 1
                                   }}
                              >
                                   <Tabs
                                        orientation="vertical"
                                        value={currentTab}
                                        onChange={handleTabsChange}
                                        textColor="primary"
                                        indicatorColor="primary"
                                        sx={{
                                             position: 'relative',
                                             '& .MuiTab-root': {
                                                  alignItems: 'flex-start',
                                                  textAlign: 'left',
                                                  minHeight: 48,
                                                  px: 2.5,
                                                  pl: 3.5, // space for indicator gutter
                                                  justifyContent: 'flex-start',
                                                  width: '100%',
                                                  '& .MuiTab-wrapper': {
                                                       alignItems: 'flex-start'
                                                  }
                                             },
                                             '& .MuiTabs-indicator': {
                                                  left: 0,
                                                  width: 3,
                                                  borderRadius: 2,
                                                  boxShadow: (theme) => `0 0 0 1px ${theme.palette.background.paper}`
                                             }
                                        }}
                                   >
                                        {tabs.map(tab => (
                                             <Tab key={tab.value} value={tab.value} label={tab.label} />
                                        ))}
                                   </Tabs>
                              </Box>
                              <Box>
                                   {/* Horizontal sticky Tabs for mobile */}
                                   <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                                        <Tabs
                                             value={currentTab}
                                             onChange={handleTabsChange}
                                             variant="scrollable"
                                             scrollButtons="auto"
                                             allowScrollButtonsMobile
                                             textColor="primary"
                                             indicatorColor="primary"
                                             sx={{
                                                  px: 0.5,
                                                  '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
                                                  '& .MuiTabScrollButton-root': {
                                                       display: 'flex',
                                                       borderRadius: 1,
                                                       bgcolor: 'transparent'
                                                  }
                                             }}
                                        >
                                             {tabs.map(tab => (
                                                  <Tab
                                                       key={tab.value}
                                                       value={tab.value}
                                                       label={tab.label}
                                                       sx={{
                                                            px: 1.5,
                                                            minHeight: 42,
                                                            flexShrink: 0,
                                                            '&.Mui-selected': { fontWeight: 600 },
                                                       }}
                                                  />
                                             ))}
                                        </Tabs>
                                        <Divider sx={{ mt: 1 }} />
                                   </Box>

                                   {/* Content */}
                                   {currentTab === 'general' && (
                                        <AccountGeneralSettings client={client} />
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
                                        <AccountTeamSettings
                                             members={allTeamMembers || []}
                                             client={client}
                                             clientSubscriptionPlan={clientSubscriptionPlan}
                                        />
                                   )}
                                   {currentTab === 'notifications' && <AccountNotificationsSettings />}
                                   {currentTab === 'security' && (
                                        <AccountSecuritySettings
                                             loginEvents={clientLogs || []}
                                             client={client}
                                             userData={userData}
                                        />
                                   )}
                              </Box>
                         </Box>
                    </Container>
               </Box>
          </>
     );
};

export default Account;
