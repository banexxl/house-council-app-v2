'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
     Container,
     Stack,
     Typography,
     Button,
     Tabs,
     Tab,
     Divider,
     SvgIcon
} from '@mui/material'
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft'
import Edit02Icon from '@mui/icons-material/Edit'
import ChevronDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { paths } from 'src/paths'

const tabs = [
     { label: 'Details', value: 'details' },
     { label: 'Invoices', value: 'invoices' },
     { label: 'Logs', value: 'logs' },
];

export const ClientDetailsHeader = () => {
     const [currentTab, setCurrentTab] = useState('overview')

     const handleTabsChange = (event: React.SyntheticEvent, newValue: string) => {
          setCurrentTab(newValue)
     }

     return (
          <Container maxWidth="xl">
               <Stack spacing={4}>
                    <Stack spacing={4}>
                         <div>
                              <Link
                                   href={paths.dashboard.clients.index}
                                   style={{
                                        color: 'inherit',
                                        alignItems: 'center',
                                        display: 'inline-flex',
                                        textDecoration: 'none'
                                   }}
                              >
                                   <SvgIcon sx={{ mr: 1 }}>
                                        <ArrowLeftIcon />
                                   </SvgIcon>
                                   <Typography variant="subtitle2">Clients</Typography>
                              </Link>
                         </div>
                         <Stack
                              alignItems="flex-start"
                              direction={{
                                   xs: 'column',
                                   md: 'row',
                              }}
                              justifyContent="space-between"
                              spacing={4}
                         >
                              <Stack
                                   alignItems="center"
                                   direction="row"
                                   spacing={2}
                              >
                                   <Button
                                        color="inherit"
                                        component={Link}
                                        endIcon={
                                             <SvgIcon>
                                                  <Edit02Icon />
                                             </SvgIcon>
                                        }
                                        href={paths.dashboard.clients.new}
                                   >
                                        Edit
                                   </Button>
                                   <Button
                                        endIcon={
                                             <SvgIcon>
                                                  <ChevronDownIcon />
                                             </SvgIcon>
                                        }
                                        variant="contained"
                                   >
                                        Actions
                                   </Button>
                              </Stack>
                         </Stack>
                         <div>
                              <Tabs
                                   indicatorColor="primary"
                                   onChange={handleTabsChange}
                                   scrollButtons="auto"
                                   sx={{ mt: 3 }}
                                   textColor="primary"
                                   value={currentTab}
                                   variant="scrollable"
                              >
                                   {tabs.map((tab) => (
                                        <Tab
                                             key={tab.value}
                                             label={tab.label}
                                             value={tab.value}
                                        />
                                   ))}
                              </Tabs>
                              <Divider />
                         </div>
                    </Stack>
               </Stack>
          </Container>
     )
}
