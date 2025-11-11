'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
     Dialog,
     DialogTitle,
     DialogContent,
     DialogActions,
     Button,
     TextField,
     List,
     ListItem,
     ListItemButton,
     ListItemAvatar,
     ListItemText,
     Avatar,
     Chip,
     Box,
     Typography,
     CircularProgress,
     Alert,
     InputAdornment,
     Tabs,
     Tab
} from '@mui/material';
import {
     Search as SearchIcon,
     Person as PersonIcon,
     Business as BusinessIcon,
     Add as AddIcon
} from '@mui/icons-material';
import { getBuildingUsers, searchBuildingUsers, type BuildingUser } from 'src/app/actions/tenant/tenant-actions';
import type { Tenant } from 'src/types/tenant';
import { getTenantFirstName, getTenantAvatar } from 'src/types/tenant';
import { createDirectMessageRoom } from 'src/app/actions/chat/chat-actions';

interface UserSelectionDialogProps {
     open: boolean;
     onClose: () => void;
     onUserSelect?: (user: Tenant) => void;
     onStartDirectMessage?: (user: Tenant) => void;
     mode: 'select' | 'direct-message' | 'group-members';
     title?: string;
     buildingId: string;
     selectedUsers?: Tenant[];
     onSelectedUsersChange?: (users: Tenant[]) => void;
}

interface TabPanelProps {
     children?: React.ReactNode;
     index: number;
     value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
     return (
          <div
               role="tabpanel"
               hidden={value !== index}
               id={`user-tabpanel-${index}`}
               aria-labelledby={`user-tab-${index}`}
               {...other}
          >
               {value === index && (
                    <Box sx={{ pt: 2 }}>
                         {children}
                    </Box>
               )}
          </div>
     );
};

export const UserSelectionDialog: React.FC<UserSelectionDialogProps> = ({
     open,
     onClose,
     onUserSelect,
     onStartDirectMessage,
     mode,
     title,
     buildingId,
     selectedUsers = [],
     onSelectedUsersChange
}) => {
     const [users, setUsers] = useState<BuildingUser[]>([]);
     const [filteredUsers, setFilteredUsers] = useState<BuildingUser[]>([]);
     const [searchQuery, setSearchQuery] = useState('');
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);
     const [creatingRoom, setCreatingRoom] = useState(false);
     const [tabValue, setTabValue] = useState(0);

     // Convert BuildingUser to Tenant for consistency
     const convertToTenant = useCallback((user: BuildingUser): Tenant => ({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          avatar_url: user.avatar || '',
          avatar: user.avatar || '',
          user_type: user.user_type,
          apartment_number: user.apartment_number,
          is_online: user.is_online,
          name: `${user.first_name} ${user.last_name}`.trim(),
          // Required tenant fields with defaults
          apartment_id: '',
          apartment: { apartment_number: user.apartment_number || '', building: { street_address: '', city: '' } },
          is_primary: false,
          move_in_date: '',
          tenant_type: 'owner' as const,
          email_opt_in: false,
          sms_opt_in: false,
          viber_opt_in: false,
          whatsapp_opt_in: false,
     }), []);

     // Load building users
     const loadUsers = useCallback(async () => {
          setLoading(true);
          setError(null);

          try {
               const result = await getBuildingUsers();
               if (result.success && result.data) {
                    setUsers(result.data);
                    setFilteredUsers(result.data);
               } else {
                    setError(result.error || 'Failed to load users');
               }
          } catch (err: any) {
               setError(err.message || 'Unexpected error');
          } finally {
               setLoading(false);
          }
     }, []);

     // Handle search
     const handleSearch = useCallback(async (query: string) => {
          setSearchQuery(query);

          if (!query.trim()) {
               setFilteredUsers(users);
               return;
          }

          try {
               const result = await searchBuildingUsers(query);
               if (result.success && result.data) {
                    setFilteredUsers(result.data);
               }
          } catch (err) {
               console.error('Search error:', err);
               // Fallback to client-side filtering
               const filtered = users.filter(user => {
                    const searchTerm = query.toLowerCase();
                    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
                    const email = user.email.toLowerCase();
                    const apartmentNumber = user.apartment_number?.toLowerCase() || '';
                    const companyName = user.company_name?.toLowerCase() || '';

                    return (
                         fullName.includes(searchTerm) ||
                         email.includes(searchTerm) ||
                         apartmentNumber.includes(searchTerm) ||
                         companyName.includes(searchTerm)
                    );
               });
               setFilteredUsers(filtered);
          }
     }, [users]);

     // Load users when dialog opens
     useEffect(() => {
          if (open) {
               loadUsers();
          }
     }, [open, loadUsers]);

     // Filter users by type
     const tenants = filteredUsers.filter(user => user.user_type === 'tenant');
     const clients = filteredUsers.filter(user => user.user_type === 'client');

     // Handle user selection
     const handleUserClick = async (user: BuildingUser) => {
          const tenantUser = convertToTenant(user);

          if (mode === 'direct-message') {
               setCreatingRoom(true);
               try {
                    const result = await createDirectMessageRoom(user.id, user.user_type, buildingId);
                    if (result.success && result.data) {
                         onStartDirectMessage?.(tenantUser);
                         onClose();
                    } else {
                         setError(result.error || 'Failed to create direct message');
                    }
               } catch (err: any) {
                    setError(err.message || 'Unexpected error');
               } finally {
                    setCreatingRoom(false);
               }
          } else if (mode === 'group-members') {
               // Toggle user selection for group creation
               const isSelected = selectedUsers.some(selected => selected.id === user.id);
               if (isSelected) {
                    onSelectedUsersChange?.(selectedUsers.filter(selected => selected.id !== user.id));
               } else {
                    onSelectedUsersChange?.([...selectedUsers, tenantUser]);
               }
          } else {
               onUserSelect?.(tenantUser);
               onClose();
          }
     };

     // Handle removing selected user
     const handleRemoveSelectedUser = (user: Tenant) => {
          onSelectedUsersChange?.(selectedUsers.filter(selected => selected.id !== user.id));
     };

     const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
          setTabValue(newValue);
     };

     const getUserDisplayName = (user: BuildingUser | Tenant) => {
          const userType = 'user_type' in user ? user.user_type : 'tenant';
          if (userType === 'tenant') {
               return `${user.first_name} ${user.last_name}`;
          } else {
               const companyName = 'company_name' in user ? user.company_name : undefined;
               return companyName || `${user.first_name} ${user.last_name}`;
          }
     };

     const getUserSecondaryText = (user: BuildingUser | Tenant) => {
          const userType = 'user_type' in user ? user.user_type : 'tenant';
          if (userType === 'tenant') {
               const apartmentNumber = 'apartment_number' in user ? user.apartment_number :
                    ('apartment' in user ? user.apartment?.apartment_number : undefined);
               return apartmentNumber ? `Apartment ${apartmentNumber}` : 'Tenant';
          } else {
               return 'Property Manager';
          }
     };

     const getUserAvatar = (user: BuildingUser | Tenant) => {
          const avatarUrl = ('avatar' in user ? user.avatar : undefined) ||
               ('avatar_url' in user ? user.avatar_url : undefined);

          if (avatarUrl) {
               return <Avatar src={avatarUrl} />;
          }

          const userType = 'user_type' in user ? user.user_type : 'tenant';
          const companyName = 'company_name' in user ? user.company_name : undefined;

          const initials = userType === 'tenant'
               ? `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`
               : companyName?.charAt(0) || user.first_name?.charAt(0) || 'P';

          return (
               <Avatar sx={{ bgcolor: userType === 'tenant' ? 'primary.main' : 'secondary.main' }}>
                    {initials}
               </Avatar>
          );
     };

     const renderUserList = (userList: BuildingUser[]) => (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
               {userList.map((user) => {
                    const isSelected = selectedUsers.some(selected => selected.id === user.id);

                    return (
                         <ListItem key={user.id} disablePadding>
                              <ListItemButton
                                   onClick={() => handleUserClick(user)}
                                   selected={isSelected}
                                   disabled={creatingRoom}
                              >
                                   <ListItemAvatar>
                                        {getUserAvatar(user)}
                                   </ListItemAvatar>
                                   <ListItemText
                                        primary={
                                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                  {getUserDisplayName(user)}
                                                  {user.user_type === 'tenant' && (
                                                       <Chip size="small" label="Tenant" color="primary" variant="outlined" />
                                                  )}
                                                  {user.user_type === 'client' && (
                                                       <Chip size="small" label="Manager" color="secondary" variant="outlined" />
                                                  )}
                                                  {user.is_online && (
                                                       <Chip size="small" label="Online" color="success" variant="outlined" />
                                                  )}
                                             </Box>
                                        }
                                        secondary={getUserSecondaryText(user)}
                                   />
                                   {mode === 'group-members' && isSelected && (
                                        <AddIcon color="primary" />
                                   )}
                              </ListItemButton>
                         </ListItem>
                    );
               })}
               {userList.length === 0 && (
                    <ListItem>
                         <ListItemText
                              primary="No users found"
                              secondary={searchQuery ? "Try a different search term" : "No users available in this building"}
                              sx={{ textAlign: 'center' }}
                         />
                    </ListItem>
               )}
          </List>
     );

     const getDialogTitle = () => {
          if (title) return title;

          switch (mode) {
               case 'direct-message':
                    return 'Start Direct Message';
               case 'group-members':
                    return 'Select Group Members';
               default:
                    return 'Select User';
          }
     };

     return (
          <Dialog
               open={open}
               onClose={onClose}
               maxWidth="sm"
               fullWidth
          >
               <DialogTitle>{getDialogTitle()}</DialogTitle>
               <DialogContent>
                    {error && (
                         <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                              {error}
                         </Alert>
                    )}

                    {/* Search Field */}
                    <TextField
                         fullWidth
                         placeholder="Search users..."
                         value={searchQuery}
                         onChange={(e) => handleSearch(e.target.value)}
                         sx={{ mb: 2 }}
                         InputProps={{
                              startAdornment: (
                                   <InputAdornment position="start">
                                        <SearchIcon />
                                   </InputAdornment>
                              ),
                         }}
                    />

                    {/* Selected Users (for group mode) */}
                    {mode === 'group-members' && selectedUsers.length > 0 && (
                         <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                   Selected Members ({selectedUsers.length})
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                   {selectedUsers.map((user) => (
                                        <Chip
                                             key={user.id}
                                             label={getUserDisplayName(user)}
                                             onDelete={() => handleRemoveSelectedUser(user)}
                                             avatar={getUserAvatar(user)}
                                             size="small"
                                        />
                                   ))}
                              </Box>
                         </Box>
                    )}

                    {loading ? (
                         <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                              <CircularProgress />
                         </Box>
                    ) : (
                         <>
                              {/* Tabs for filtering by user type */}
                              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                                   <Tab label={`All (${filteredUsers.length})`} />
                                   <Tab label={`Tenants (${tenants.length})`} icon={<PersonIcon />} iconPosition="start" />
                                   <Tab label={`Managers (${clients.length})`} icon={<BusinessIcon />} iconPosition="start" />
                              </Tabs>

                              {/* User Lists */}
                              <TabPanel value={tabValue} index={0}>
                                   {renderUserList(filteredUsers)}
                              </TabPanel>
                              <TabPanel value={tabValue} index={1}>
                                   {renderUserList(tenants)}
                              </TabPanel>
                              <TabPanel value={tabValue} index={2}>
                                   {renderUserList(clients)}
                              </TabPanel>
                         </>
                    )}
               </DialogContent>
               <DialogActions>
                    <Button onClick={onClose} disabled={creatingRoom}>
                         Cancel
                    </Button>
                    {mode === 'group-members' && (
                         <Button
                              variant="contained"
                              disabled={selectedUsers.length === 0 || creatingRoom}
                              onClick={onClose}
                         >
                              Continue ({selectedUsers.length} selected)
                         </Button>
                    )}
                    {creatingRoom && (
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={16} />
                              <Typography variant="body2">Creating chat...</Typography>
                         </Box>
                    )}
               </DialogActions>
          </Dialog>
     );
};

export default UserSelectionDialog;