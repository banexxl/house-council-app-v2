"use client"

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, MenuItem, FormControlLabel, Checkbox, InputLabel, Select, OutlinedInput, Chip, Box } from '@mui/material';

interface AnnouncementFormDialogProps {
     open: boolean;
     onClose: () => void;
     categories: { id: string; name: string }[];
     tenants: { id: string; name: string }[];
     apartments: { id: string; name: string }[];
     onSubmit: (data: any) => void;
}

export default function AnnouncementFormDialog({ open, onClose, categories, tenants, apartments, onSubmit }: AnnouncementFormDialogProps) {
     const [title, setTitle] = React.useState('');
     const [message, setMessage] = React.useState('');
     const [category, setCategory] = React.useState('');
     const [visibility, setVisibility] = React.useState<'building' | 'apartments' | 'tenants'>('building');
     const [selectedApartments, setSelectedApartments] = React.useState<string[]>([]);
     const [selectedTenants, setSelectedTenants] = React.useState<string[]>([]);
     const [attachments, setAttachments] = React.useState<File[]>([]);
     const [pin, setPin] = React.useState(false);
     const [schedule, setSchedule] = React.useState<string>('');

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) {
               setAttachments(Array.from(e.target.files));
          }
     };

     const handleSubmit = () => {
          onSubmit({ title, message, category, visibility, selectedApartments, selectedTenants, attachments, pin, schedule });
          onClose();
     };

     return (
          <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
               <DialogTitle>New Announcement</DialogTitle>
               <DialogContent>
                    <Stack spacing={2} mt={1}>
                         <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} fullWidth required />
                         <TextField label="Message" value={message} onChange={e => setMessage(e.target.value)} fullWidth required multiline minRows={3} />
                         <TextField select label="Category" value={category} onChange={e => setCategory(e.target.value)} fullWidth required>
                              {categories.map(cat => (
                                   <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                              ))}
                         </TextField>
                         <InputLabel id="visibility-label">Visibility</InputLabel>
                         <Select
                              labelId="visibility-label"
                              value={visibility}
                              onChange={e => setVisibility(e.target.value as any)}
                              input={<OutlinedInput label="Visibility" />}
                              fullWidth
                         >
                              <MenuItem value="building">Building-wide</MenuItem>
                              <MenuItem value="apartments">Specific Apartments</MenuItem>
                              <MenuItem value="tenants">Specific Tenants</MenuItem>
                         </Select>
                         {visibility === 'apartments' && (
                              <Select
                                   multiple
                                   value={selectedApartments}
                                   onChange={e => setSelectedApartments(e.target.value as string[])}
                                   input={<OutlinedInput label="Apartments" />}
                                   renderValue={selected => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                             {(selected as string[]).map(value => (
                                                  <Chip key={value} label={apartments.find(a => a.id === value)?.name || value} />
                                             ))}
                                        </Box>
                                   )}
                                   fullWidth
                              >
                                   {apartments.map(ap => (
                                        <MenuItem key={ap.id} value={ap.id}>{ap.name}</MenuItem>
                                   ))}
                              </Select>
                         )}
                         {visibility === 'tenants' && (
                              <Select
                                   multiple
                                   value={selectedTenants}
                                   onChange={e => setSelectedTenants(e.target.value as string[])}
                                   input={<OutlinedInput label="Tenants" />}
                                   renderValue={selected => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                             {(selected as string[]).map(value => (
                                                  <Chip key={value} label={tenants.find(t => t.id === value)?.name || value} />
                                             ))}
                                        </Box>
                                   )}
                                   fullWidth
                              >
                                   {tenants.map(tn => (
                                        <MenuItem key={tn.id} value={tn.id}>{tn.name}</MenuItem>
                                   ))}
                              </Select>
                         )}
                         <Button variant="outlined" component="label">
                              Attach Files
                              <input type="file" hidden multiple onChange={handleFileChange} />
                         </Button>
                         <FormControlLabel control={<Checkbox checked={pin} onChange={e => setPin(e.target.checked)} />} label="Pin to top" />
                         <TextField
                              label="Schedule (optional)"
                              type="datetime-local"
                              value={schedule}
                              onChange={e => setSchedule(e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              fullWidth
                         />
                    </Stack>
               </DialogContent>
               <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">Create</Button>
               </DialogActions>
          </Dialog>
     );
}
