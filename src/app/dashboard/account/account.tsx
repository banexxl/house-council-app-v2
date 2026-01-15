// 'use customer';

// import type { ChangeEvent } from 'react';
// import { useCallback, useState } from 'react';
// import Box from '@mui/material/Box';
// import Container from '@mui/material/Container';
// import Tab from '@mui/material/Tab';
// import Tabs from '@mui/material/Tabs';
// import Typography from '@mui/material/Typography';

// import { AccountGeneralSettings } from 'src/sections/dashboard/account/account-general-settings';
// import { AccountNotificationsSettings } from 'src/sections/dashboard/account/account-notifications-settings';
// import { AccountTeamSettings } from 'src/sections/dashboard/account/account-team-settings';
// import { AccountSecuritySettings } from 'src/sections/dashboard/account/account-security-settings';
// import { SubscriptionPlan } from 'src/types/subscription-plan';
// import { PolarOrder } from 'src/types/polar-order-types';
// import { User } from '@supabase/supabase-js';
// import { ServerLog } from 'src/libs/supabase/server-logging';
// import { useTranslation } from 'react-i18next';
// import { PolarCustomer } from 'src/types/polar-customer-types';


// export interface AccountProps {
//      customer: PolarCustomer;
//      userData: User;
//      customerSubscriptionPlan: SubscriptionPlan | null;
//      customerInvoices: PolarOrder[] | undefined | null;
//      subscriptionPlans: SubscriptionPlan[] | null;
//      customerLogs: ServerLog[] | null;
// }

// const Account = ({ customer, userData, customerSubscriptionPlan, customerInvoices, subscriptionPlans, customerLogs }: AccountProps) => {

//      const { t } = useTranslation();
//      const [currentTab, setCurrentTab] = useState<string>('general');

//      const handleTabsChange = useCallback((event: ChangeEvent<any>, value: string): void => {
//           setCurrentTab(value);
//      }, []);

//      const tabs = [
//           { label: t('account.lblGeneral'), value: 'general' },
//           { label: t('account.lblTeam'), value: 'team' },
//           { label: t('account.lblNotifications'), value: 'notifications' },
//           { label: t('account.lblSecurity'), value: 'security' },
//      ];

//      return (
//           <>
//                <Box
//                     component="main"
//                     sx={{
//                          flexGrow: 1,
//                          py: 8,
//                     }}
//                >
//                     <Container maxWidth="xl">
//                          <Typography variant="h4" sx={{ mb: 2 }}>{t('nav.account')}</Typography>
//                          <Box
//                               sx={{
//                                    display: 'grid',
//                                    gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
//                                    gap: 3
//                               }}
//                          >
//                               {/* Vertical Tabs for md+ */}
//                               <Box
//                                    sx={{
//                                         display: { xs: 'none', md: 'flex' },
//                                         flexDirection: 'column',
//                                         position: 'sticky',
//                                         top: (theme) => theme.spacing(9),
//                                         alignSelf: 'start',
//                                         height: 'fit-content',
//                                         borderRight: (theme) => `1px solid ${theme.palette.divider}`,
//                                         pr: 1
//                                    }}
//                               >
//                                    <Tabs
//                                         allowScrollButtonsMobile
//                                         orientation="vertical"
//                                         value={currentTab}
//                                         onChange={handleTabsChange}
//                                         textColor="primary"
//                                         indicatorColor="primary"
//                                         sx={{
//                                              position: 'relative',
//                                              '& .MuiTab-root': {
//                                                   alignItems: 'flex-start',
//                                                   textAlign: 'left',
//                                                   minHeight: 48,
//                                                   px: 2.5,
//                                                   pl: 3.5, // space for indicator gutter
//                                                   justifyContent: 'flex-start',
//                                                   width: '100%',
//                                                   '& .MuiTab-wrapper': {
//                                                        alignItems: 'flex-start'
//                                                   }
//                                              },
//                                              '& .MuiTabs-indicator': {
//                                                   left: 0,
//                                                   width: 3,
//                                                   borderRadius: 2,
//                                                   boxShadow: (theme) => `0 0 0 1px ${theme.palette.background.paper}`
//                                              }
//                                         }}
//                                    >
//                                         {tabs.map((tab, index) => (
//                                              <Tab key={index} value={tab.value} label={tab.label} />
//                                         ))}
//                                    </Tabs>
//                               </Box>
//                               <Box sx={{ minWidth: 0 }}>
//                                    {/* Mobile horizontal tabs (desktop hidden) */}
//                                    <Box
//                                         sx={{
//                                              pt: { xs: 1, md: 0 },
//                                              mb: { xs: 2, md: 3 },
//                                              display: 'flex',
//                                              alignItems: 'flex-start',
//                                              overflowX: { xs: 'auto', md: 'visible' },
//                                              position: { xs: 'sticky', md: 'static' },
//                                              top: { xs: (theme) => `calc(${theme.spacing(0)} + env(safe-area-inset-top, 0px))`, md: 'auto' },
//                                              zIndex: { xs: 5, md: 'auto' },
//                                              backgroundColor: { xs: 'background.paper', md: 'transparent' },
//                                              boxShadow: { xs: '0 2px 4px rgba(0,0,0,0.06)', md: 'none' },
//                                              borderBottom: { xs: 1, md: 0 },
//                                              borderColor: { xs: 'divider', md: 'transparent' },
//                                         }}
//                                    >
//                                         <Tabs
//                                              value={currentTab}
//                                              onChange={handleTabsChange}
//                                              orientation="horizontal"
//                                              variant="scrollable"
//                                              allowScrollButtonsMobile
//                                              scrollButtons
//                                              slotProps={{
//                                                   scrollButtons: {
//                                                        sx: {
//                                                             '&.Mui-disabled': {
//                                                                  opacity: 0.4,
//                                                                  display: 'inline-flex'
//                                                             }
//                                                        }
//                                                   }
//                                              }}
//                                              sx={{
//                                                   display: { xs: 'flex', md: 'none' },
//                                                   px: 0.5,
//                                                   borderBottom: 1,
//                                                   borderColor: 'divider',
//                                              }}
//                                         >
//                                              {tabs.map(tab => (
//                                                   <Tab
//                                                        key={tab.value}
//                                                        value={tab.value}
//                                                        label={tab.label}
//                                                        sx={{
//                                                             px: 1.5,
//                                                             minHeight: 42,
//                                                             flexShrink: 0,
//                                                             '&.Mui-selected': { fontWeight: 600 },
//                                                        }}
//                                                   />
//                                              ))}
//                                         </Tabs>
//                                    </Box>

//                                    {/* Content */}
//                                    <Box sx={{ minWidth: 0 }}>
//                                         {currentTab === 'general' && (
//                                              <AccountGeneralSettings customer={customer} />
//                                         )}
//                                         {/* {currentTab === 'team' && (
//                                              <AccountTeamSettings
//                                                   customer={customer}
//                                                   customerSubscriptionPlan={customerSubscriptionPlan}
//                                              />
//                                         )} */}
//                                         {currentTab === 'notifications' && <AccountNotificationsSettings customer={customer} />}
//                                         {currentTab === 'security' && (
//                                              <AccountSecuritySettings
//                                                   loginEvents={customerLogs || []}
//                                                   customer={customer}
//                                                   userData={userData}
//                                              />
//                                         )}
//                                    </Box>
//                               </Box>
//                          </Box>
//                     </Container>
//                </Box>
//           </>
//      );
// };

// export default Account;
