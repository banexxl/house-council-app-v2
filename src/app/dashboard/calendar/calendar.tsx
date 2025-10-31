"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import AddIcon from '@mui/icons-material/Add';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
// Using Box with CSS grid instead of MUI Grid to avoid layout API mismatch
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import MonthGrid from './month-grid';
import { useTranslation } from 'react-i18next';
import { tokens } from 'src/locales/tokens';
import { useDispatch, useSelector } from 'react-redux';
import { thunks } from 'src/thunks/calendar';
import type { CalendarEvent, EventType } from 'src/types/calendar';
import type { Building } from 'src/types/building';
import { EntityFormHeader } from 'src/components/entity-form-header';
import { paths } from 'src/paths';

export interface CalendarClientProps { initialEvents: CalendarEvent[]; clientId: string | null; isTenant: boolean; isAdmin: boolean; buildings?: Building[]; }

// Colors for event types (labels translated dynamically)
const BASE_EVENT_TYPE_META: Record<EventType, { color: string }> = {
     appointment: { color: '#1976d2' },
     meeting: { color: '#9c27b0' },
     reminder: { color: '#ff9800' },
     task: { color: '#2e7d32' },
     holiday: { color: '#d32f2f' },
     other: { color: '#607d8b' },
};


export const CalendarClient = ({ initialEvents, clientId, isTenant, isAdmin, buildings = [] }: CalendarClientProps) => {
     const { t } = useTranslation();
     const EVENT_TYPE_META: Record<EventType, { label: string; color: string }> = useMemo(() => ({
          appointment: { label: t(tokens.calendar.types.appointment), color: BASE_EVENT_TYPE_META.appointment.color },
          meeting: { label: t(tokens.calendar.types.meeting), color: BASE_EVENT_TYPE_META.meeting.color },
          reminder: { label: t(tokens.calendar.types.reminder), color: BASE_EVENT_TYPE_META.reminder.color },
          task: { label: t(tokens.calendar.types.task), color: BASE_EVENT_TYPE_META.task.color },
          holiday: { label: t(tokens.calendar.types.holiday), color: BASE_EVENT_TYPE_META.holiday.color },
          other: { label: t(tokens.calendar.types.other), color: BASE_EVENT_TYPE_META.other.color },
     }), [t]);
     const dispatch = useDispatch();
     const events = useSelector((state: any) => state.calendar.events) as CalendarEvent[];
     const [selectedDate, setSelectedDate] = useState<Date>(new Date());
     const [viewMonth, setViewMonth] = useState<number>(selectedDate.getMonth());
     const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
     const [openModal, setOpenModal] = useState(false);
     const [editingEventId, setEditingEventId] = useState<string | null>(null);
     const [creating, setCreating] = useState(false);
     const [optimisticEvents, setOptimisticEvents] = useState<CalendarEvent[]>([]);
     // Form state for new event
     const [formTitle, setFormTitle] = useState('');
     const [formDescription, setFormDescription] = useState('');
     const [formType, setFormType] = useState<EventType>('meeting');
     const [formStartTime, setFormStartTime] = useState('09:00');
     const [formEndTime, setFormEndTime] = useState('10:00');
     const [timeError, setTimeError] = useState<string | null>(null);
     const [formBuildingId, setFormBuildingId] = useState<string>('');
     const [errors, setErrors] = useState<{ title?: string; start?: string; end?: string; type?: string; building?: string }>({});

     // Initial fetch
     useEffect(() => { if (!events || events.length === 0) (dispatch as any)(thunks.getEvents()); }, []); // eslint-disable-line

     const mdDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

     // Build lookup map for building addresses
     const buildingMap = useMemo(() => {
          const m = new Map<string, string>();
          buildings.forEach(b => {
               const loc = b.building_location;
               if (loc) {
                    const addr = `${loc.street_address || ''} ${loc.street_number || ''}`.trim();
                    const city = loc.city || '';
                    m.set(b.id, `${addr}${addr && city ? ', ' : ''}${city}`);
               }
          });
          return m;
     }, [buildings]);

     // Events for selected date
     const mergedEvents = useMemo(() => [...events, ...optimisticEvents], [events, optimisticEvents]);
     const dayEvents = useMemo(() => {
          const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
          const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
          return mergedEvents.filter(ev => ev.start_date_time >= startOfDay && ev.start_date_time < endOfDay)
               .sort((a, b) => a.start_date_time - b.start_date_time);
     }, [mergedEvents, selectedDate]);

     const handlePrevMonth = () => {
          const newDate = new Date(viewYear, viewMonth - 1, 1);
          setViewYear(newDate.getFullYear());
          setViewMonth(newDate.getMonth());
     };
     const handleNextMonth = () => {
          const newDate = new Date(viewYear, viewMonth + 1, 1);
          setViewYear(newDate.getFullYear());
          setViewMonth(newDate.getMonth());
     };
     const handleToday = () => {
          const today = new Date();
          setViewYear(today.getFullYear());
          setViewMonth(today.getMonth());
          setSelectedDate(today);
     };
     const handleSelectDay = (day: Date) => {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          if (day < todayStart) return; // forbid selecting past dates for new events
          setSelectedDate(day);
     };

     const readOnly = isTenant && !isAdmin;
     const effectiveClientId = clientId || 'client';
     const handleOpenCreateModal = () => { if (readOnly) return; setEditingEventId(null); setOpenModal(true); };
     const handleOpenEditModal = (event: CalendarEvent) => {
          if (readOnly) return;
          setEditingEventId(event.id);
          setFormTitle(event.title);
          setFormDescription(event.description || '');
          setFormType(event.calendar_event_type || 'other');
          setFormBuildingId(event.building_id || '');
          const startDate = new Date(event.start_date_time);
          const endDate = new Date(event.end_date_time);
          setSelectedDate(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
          const pad = (n: number) => n.toString().padStart(2, '0');
          setFormStartTime(`${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`);
          setFormEndTime(`${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`);
          setOpenModal(true);
     };
     const handleCloseModal = () => { setOpenModal(false); setEditingEventId(null); };

     const handleSubmit = async () => {
          // Basic field presence validation
          const newErrors: typeof errors = {};
          if (!formTitle.trim()) newErrors.title = t(tokens.calendar.validation.titleRequired);
          if (!formStartTime) newErrors.start = t(tokens.calendar.validation.startRequired);
          if (!formEndTime) newErrors.end = t(tokens.calendar.validation.endRequired);
          if (!formType) newErrors.type = t(tokens.calendar.validation.typeRequired);
          if (!formBuildingId) newErrors.building = t(tokens.calendar.validation.buildingRequired);

          setErrors(newErrors);
          if (Object.keys(newErrors).length > 0) return;
          // Build start/end timestamps from selectedDate + times
          const [sh, sm] = formStartTime.split(':').map(Number);
          const [eh, em] = formEndTime.split(':').map(Number);
          const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), sh, sm).getTime();
          const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), eh, em).getTime();
          setTimeError(null);
          if (end <= start) { setTimeError(t(tokens.calendar.validation.endAfterStart)); return; }
          // Disallow creating events in the past (only for new events)
          if (!editingEventId && start < Date.now()) { setTimeError(t(tokens.calendar.validation.startInPast)); return; }
          if (readOnly) return;
          if (!editingEventId) {
               setCreating(true);
               // optimistic temp event
               const tempId = `temp-${Date.now()}`;
               const optimistic: CalendarEvent = {
                    id: tempId,
                    all_day: false,
                    description: formDescription,
                    end_date_time: end,
                    start_date_time: start,
                    title: formTitle,
                    client_id: effectiveClientId,
                    calendar_event_type: formType,
                    building_id: formBuildingId || null,
               };
               setOptimisticEvents(prev => [...prev, optimistic]);
               await (dispatch as any)(thunks.createEvent({
                    all_day: false,
                    description: formDescription,
                    end_date_time: end,
                    start_date_time: start,
                    title: formTitle,
                    calendar_event_type: formType,
                    building_id: formBuildingId || null,
               }));
               setOptimisticEvents(prev => prev.filter(e => e.id !== tempId));
               setCreating(false);
          } else {
               setCreating(true);
               await (dispatch as any)(thunks.updateEvent({
                    eventId: editingEventId,
                    update: {
                         all_day: false,
                         description: formDescription,
                         end_date_time: end,
                         start_date_time: start,
                         title: formTitle,
                         calendar_event_type: formType,
                         building_id: formBuildingId || null,
                    },
               }));
               setCreating(false);
          }
          // Reset and close
          setFormTitle(''); setFormDescription(''); setFormType('meeting'); setFormStartTime('09:00'); setFormEndTime('10:00'); setFormBuildingId(''); setTimeError(null); setErrors({});
          handleCloseModal();
     };

     const handleDeleteEvent = async () => {
          if (!editingEventId) return;
          if (readOnly) return;
          setCreating(true);
          await (dispatch as any)(thunks.deleteEvent({ eventId: editingEventId }));
          setCreating(false);
          handleCloseModal();
     };

     const showRightPanel = !mdDown; // collapse right panel below md

     return (
          <Stack spacing={3}>
               <EntityFormHeader
                    backHref={paths.dashboard.index}
                    backLabel={t('nav.adminDashboard')}
                    title={t(tokens.calendar.title)}
                    breadcrumbs={[
                         { title: t('nav.adminDashboard'), href: paths.dashboard.index },
                         { title: t(tokens.calendar.title) },
                    ]}
               />
               <Stack spacing={3} direction={{ xs: 'column', md: 'row' }}>
                    {/* Left: Calendar grid */}
                    <Card sx={{ flex: 3, p: { xs: 1.5, md: 2 } }}>
                         <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 1.5, md: 2 } }}>
                              <Typography variant={mdDown ? 'h6' : 'h5'}>{t(tokens.calendar.title)}</Typography>
                              {mdDown ? (
                                   <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Tooltip title={t(tokens.calendar.prev)}><span><IconButton size="small" onClick={handlePrevMonth}><ChevronLeftIcon fontSize="small" /></IconButton></span></Tooltip>
                                        <Tooltip title={t(tokens.calendar.today)}><span><IconButton size="small" onClick={handleToday}><TodayIcon fontSize="small" /></IconButton></span></Tooltip>
                                        <Tooltip title={t(tokens.calendar.next)}><span><IconButton size="small" onClick={handleNextMonth}><ChevronRightIcon fontSize="small" /></IconButton></span></Tooltip>
                                        {!readOnly && (
                                             <Tooltip title={t(tokens.calendar.addEvent)}>
                                                  <span>
                                                       <IconButton size="small" color="primary" onClick={handleOpenCreateModal}>
                                                            <AddIcon fontSize="small" />
                                                       </IconButton>
                                                  </span>
                                             </Tooltip>
                                        )}
                                   </Stack>
                              ) : (
                                   <Stack direction="row" spacing={1}>
                                        <Button variant="outlined" onClick={handlePrevMonth}>{t(tokens.calendar.prev)}</Button>
                                        <Button variant="outlined" onClick={handleToday}>{t(tokens.calendar.today)}</Button>
                                        <Button variant="outlined" onClick={handleNextMonth}>{t(tokens.calendar.next)}</Button>
                                        {!readOnly && <Button variant="contained" onClick={handleOpenCreateModal}>{t(tokens.calendar.addEvent)}</Button>}
                                   </Stack>
                              )}
                         </Stack>
                         <Typography variant="subtitle2" sx={{ mb: 1 }}>{new Date(viewYear, viewMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Typography>
                         <MonthGrid
                              year={viewYear}
                              month={viewMonth}
                              selectedDate={selectedDate}
                              events={mergedEvents}
                              onSelectDate={handleSelectDay}
                              eventTypeMeta={EVENT_TYPE_META}
                         />
                         {/* Mobile events list (below grid) */}
                         {mdDown && (
                              <Box sx={{ mt: 2 }}>
                                   <Typography variant="subtitle1" gutterBottom>{t(tokens.calendar.eventsOnDate, { date: selectedDate.toLocaleDateString() })}</Typography>
                                   <Divider sx={{ mb: 1.5 }} />
                                   {dayEvents.length === 0 && <Typography variant="body2" color="text.secondary">{t(tokens.calendar.noEvents)}</Typography>}
                                   {creating && <Typography variant="caption" color="primary.main">{t(tokens.calendar.creating)}</Typography>}
                                   <Stack spacing={1}>
                                        {dayEvents.map(ev => {
                                             const start = new Date(ev.start_date_time);
                                             const end = new Date(ev.end_date_time);
                                             const bAddr = ev.building_id ? buildingMap.get(ev.building_id) : null;
                                             return (
                                                  <Box key={ev.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }} onClick={() => handleOpenEditModal(ev)}>
                                                       <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="subtitle2" noWrap>{ev.title}</Typography>
                                                            <Chip size="small" label={EVENT_TYPE_META[ev.calendar_event_type || 'other'].label} sx={{ bgcolor: EVENT_TYPE_META[ev.calendar_event_type || 'other'].color, color: '#fff' }} />
                                                       </Stack>
                                                       {bAddr && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{bAddr}</Typography>}
                                                       <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                                       {ev.description && <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>{ev.description}</Typography>}
                                                  </Box>
                                             );
                                        })}
                                   </Stack>
                              </Box>
                         )}
                    </Card>
                    {/* Right: Selected day events (hidden below md) */}
                    {showRightPanel && (
                         <Card sx={{ flex: 2, p: 2 }}>
                              <Typography variant="h6" gutterBottom>{t(tokens.calendar.eventsOnDate, { date: selectedDate.toLocaleDateString() })}</Typography>
                              <Divider sx={{ mb: 2 }} />
                              {dayEvents.length === 0 && <Typography variant="body2" color="text.secondary">{t(tokens.calendar.noEvents)}</Typography>}
                              {creating && <Typography variant="caption" color="primary.main">{t(tokens.calendar.creating)}</Typography>}
                              <Stack spacing={1}>
                                   {dayEvents.map(ev => {
                                        const start = new Date(ev.start_date_time);
                                        const end = new Date(ev.end_date_time);
                                        const bAddr = ev.building_id ? buildingMap.get(ev.building_id) : null;
                                        return (
                                             <Box key={ev.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer' }} onClick={() => handleOpenEditModal(ev)}>
                                                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                       <Typography variant="subtitle2">{ev.title}</Typography>
                                                       <Chip size="small" label={EVENT_TYPE_META[ev.calendar_event_type || 'other'].label} sx={{ bgcolor: EVENT_TYPE_META[ev.calendar_event_type || 'other'].color, color: '#fff' }} />
                                                  </Stack>
                                                  {bAddr && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{bAddr}</Typography>}
                                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                                                  {ev.description && <Typography variant="body2" sx={{ mt: 0.5 }}>{ev.description}</Typography>}
                                             </Box>
                                        );
                                   })}
                              </Stack>
                         </Card>
                    )}
                    {!readOnly && mdDown && (
                         <Fab color="primary" sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: (theme) => theme.zIndex.fab }} onClick={handleOpenCreateModal} aria-label={t(tokens.calendar.addEvent)}>
                              <AddIcon />
                         </Fab>
                    )}
                    {/* Modal for adding event */}
                    <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="sm">
                         <DialogTitle>{editingEventId ? t(tokens.calendar.editEvent) : t(tokens.calendar.addEvent)}</DialogTitle>
                         <DialogContent>
                              <Typography variant="body2" sx={{ mb: 2 }}>{editingEventId ? t(tokens.calendar.editEvent) : t(tokens.calendar.addEvent)}</Typography>
                              <Stack spacing={2}>
                                   <TextField label={t(tokens.calendar.titleLabel)} value={formTitle} onChange={e => { setFormTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: undefined })); }} fullWidth error={!!errors.title} helperText={errors.title} />
                                   <TextField label={t(tokens.calendar.descriptionLabel)} value={formDescription} onChange={e => setFormDescription(e.target.value)} fullWidth multiline minRows={2} />
                                   <Stack direction="row" spacing={2}>
                                        <TextField label={t(tokens.calendar.startTimeLabel)} type="time" value={formStartTime} onChange={e => { setFormStartTime(e.target.value); if (timeError) setTimeError(null); if (errors.start) setErrors(p => ({ ...p, start: undefined })); }} inputProps={{ step: 300 }} fullWidth error={!!timeError || !!errors.start} helperText={errors.start} />
                                        <TextField label={t(tokens.calendar.endTimeLabel)} type="time" value={formEndTime} onChange={e => { setFormEndTime(e.target.value); if (timeError) setTimeError(null); if (errors.end) setErrors(p => ({ ...p, end: undefined })); }} inputProps={{ step: 300 }} fullWidth error={!!timeError || !!errors.end} helperText={errors.end} />
                                   </Stack>
                                   <TextField select label={t(tokens.calendar.eventTypeLabel)} value={formType} onChange={e => { setFormType(e.target.value as EventType); if (errors.type) setErrors(p => ({ ...p, type: undefined })); }} fullWidth error={!!errors.type} helperText={errors.type}>
                                        {Object.entries(BASE_EVENT_TYPE_META).map(([key, meta]) => (
                                             <MenuItem key={key} value={key}>{t((tokens.calendar.types as any)[key])}</MenuItem>
                                        ))}
                                   </TextField>
                                   {buildings.length > 0 && (
                                        <TextField select label={t(tokens.calendar.buildingLabel)} value={formBuildingId} onChange={e => { setFormBuildingId(e.target.value); if (errors.building) setErrors(p => ({ ...p, building: undefined })); }} fullWidth error={!!errors.building} helperText={errors.building}>
                                             <MenuItem value="">{t(tokens.calendar.noBuildingOption)}</MenuItem>
                                             {buildings.map(b => (
                                                  <MenuItem key={b.id} value={b.id}>
                                                       {b.building_location ? `${b.building_location.street_address || ''} ${b.building_location.street_number || ''}, ${b.building_location.city}` : b.id}
                                                  </MenuItem>
                                             ))}
                                        </TextField>
                                   )}
                              </Stack>
                         </DialogContent>
                         <DialogActions>
                              <Button onClick={handleCloseModal} color="inherit">{t(tokens.calendar.cancel)}</Button>
                              {editingEventId && !readOnly && <Button onClick={handleDeleteEvent} color="error" disabled={creating}>{creating ? t(tokens.calendar.deleting) : t(tokens.calendar.delete)}</Button>}
                              {!readOnly && <Button onClick={handleSubmit} variant="contained" disabled={!formTitle || creating}>{creating ? (editingEventId ? t(tokens.calendar.saving) : t(tokens.calendar.creating)) : (editingEventId ? t(tokens.calendar.save) : t(tokens.calendar.create))}</Button>}
                         </DialogActions>
                    </Dialog>
               </Stack>
          </Stack>
     );
};
export default CalendarClient;
