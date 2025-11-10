'use client';

import React, { FC, useState } from 'react';
import {
     Box,
     Container,
     Typography,
     Card,
     CardContent,
     Stack,
     Alert,
     AlertTitle,
     Select,
     MenuItem,
     FormControl,
     InputLabel
} from '@mui/material';
import { Seo } from 'src/components/seo';
import { SupabaseChat } from 'src/sections/dashboard/chat/supabase-chat';
import type { UserDataCombined } from 'src/libs/supabase/server-auth';

interface ChatPageClientProps {
     buildingId?: string;
     userType: 'admin' | 'client' | 'clientMember' | 'tenant';
     buildings: any[];
     user: UserDataCombined;
}

export const ChatPageClient: FC<ChatPageClientProps> = ({
     buildingId,
     userType,
     buildings,
     user
}) => {

     const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId);

     // Show building selector for admins and clients with multiple buildings
     const showBuildingSelector = (userType === 'admin' || userType === 'client' || userType === 'clientMember')
          && buildings.length > 1;

     return (
          <>
               <Seo title="Chat System" />
               <Box component="main" sx={{ flexGrow: 1, py: 8 }}>
                    <Container maxWidth="xl">
                         <Stack spacing={3}>
                              <Box>
                                   <Typography variant="h4" gutterBottom>
                                        Chat System
                                   </Typography>
                                   <Typography variant="body1" color="text.secondary">
                                        Real-time messaging system for building tenants and property managers
                                   </Typography>
                              </Box>

                              {!user.userData ? (
                                   <Alert severity="warning">
                                        <AlertTitle>Authentication Required</AlertTitle>
                                        Please log in to access the chat system.
                                   </Alert>
                              ) : !buildingId && buildings.length === 0 && userType !== 'tenant' ? (
                                   <Alert severity="error">
                                        <AlertTitle>No Building Access</AlertTitle>
                                        You don't have access to any buildings. Please contact your administrator.
                                   </Alert>
                              ) : userType === 'tenant' && !buildingId ? (
                                   <Alert severity="error">
                                        <AlertTitle>No Building Access</AlertTitle>
                                        Unable to determine your building context. Please contact your administrator.
                                   </Alert>
                              ) : (
                                   <>
                                        {showBuildingSelector && (
                                             <Card>
                                                  <CardContent>
                                                       <FormControl fullWidth>
                                                            <InputLabel>Select Building</InputLabel>
                                                            <Select
                                                                 value={selectedBuildingId || ''}
                                                                 label="Select Building"
                                                                 onChange={(e) => setSelectedBuildingId(e.target.value)}
                                                            >
                                                                 {buildings.map((building) => (
                                                                      <MenuItem key={building.id} value={building.id}>
                                                                           {building.name || building.address || `Building ${building.id}`}
                                                                      </MenuItem>
                                                                 ))}
                                                            </Select>
                                                       </FormControl>
                                                  </CardContent>
                                             </Card>
                                        )}

                                        <Card sx={{ height: 'calc(100vh - 200px)' }}>
                                             <CardContent sx={{ p: 0, height: '100%' }}>
                                                  <SupabaseChat buildingId={selectedBuildingId || buildingId} />
                                             </CardContent>
                                        </Card>

                                        <Card>
                                             <CardContent>
                                                  <Typography variant="h6" gutterBottom>
                                                       Chat System Features
                                                  </Typography>
                                                  <Stack spacing={2}>
                                                       <Box>
                                                            <Typography variant="subtitle2" color="primary">
                                                                 Real-time Messaging
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Messages are delivered instantly using Supabase real-time subscriptions
                                                            </Typography>
                                                       </Box>
                                                       <Box>
                                                            <Typography variant="subtitle2" color="primary">
                                                                 Group & Direct Chats
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Support for both group conversations and private direct messages
                                                            </Typography>
                                                       </Box>
                                                       <Box>
                                                            <Typography variant="subtitle2" color="primary">
                                                                 Typing Indicators
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 See when someone is typing a message in real-time
                                                            </Typography>
                                                       </Box>
                                                       <Box>
                                                            <Typography variant="subtitle2" color="primary">
                                                                 Read Receipts
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Track when messages have been read by recipients
                                                            </Typography>
                                                       </Box>
                                                       <Box>
                                                            <Typography variant="subtitle2" color="primary">
                                                                 Building-Specific Rooms
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary">
                                                                 Chat rooms are organized by building for better organization
                                                            </Typography>
                                                       </Box>
                                                  </Stack>
                                             </CardContent>
                                        </Card>
                                   </>
                              )}
                         </Stack>
                    </Container>
               </Box>
          </>
     );
};