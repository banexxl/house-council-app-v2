"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import Calendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import timelinePlugin from '@fullcalendar/timeline';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles/createTheme';
import { useDispatch, useSelector } from 'react-redux';
import { thunks } from 'src/thunks/calendar';
import type { CalendarEvent, CalendarView } from 'src/types/calendar';
import { useDialog } from 'src/hooks/use-dialog';

interface CalendarClientProps {
     initialEvents: CalendarEvent[];
}

interface CreateDialogData { range?: { start: number; end: number } }
interface UpdateDialogData { eventId?: string }

const useCurrentEvent = (events: CalendarEvent[], dialogData?: UpdateDialogData): CalendarEvent | undefined => {
     return useMemo(() => {
          if (!dialogData) return undefined;
          return events.find((e) => e.id === dialogData.eventId);
     }, [dialogData, events]);
};

export const CalendarClient = ({ initialEvents }: CalendarClientProps) => {
     const dispatch = useDispatch();
     const calendarRef = useRef<Calendar | null>(null);
     const events = useSelector((state: any) => state.calendar.events) as CalendarEvent[];
     const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
     const [date, setDate] = useState<Date>(new Date());
     const [view, setView] = useState<CalendarView>(mdUp ? 'timeGridDay' : 'dayGridMonth');
     const createDialog = useDialog<CreateDialogData>();
     const updateDialog = useDialog<UpdateDialogData>();
     const updatingEvent = useCurrentEvent(events, updateDialog.data);

     // Seed store on first mount if empty
     useEffect(() => {
          // If slice already hydrated skip; else load from server via thunk
          if (!events || events.length === 0) {
               (dispatch as any)(thunks.getEvents());
          }
     }, []); // eslint-disable-line react-hooks/exhaustive-deps

     // Responsive view update
     const handleScreenResize = useCallback(() => {
          const calendarEl = calendarRef.current;
          if (calendarEl) {
               const api = calendarEl.getApi();
               const newView = mdUp ? 'dayGridMonth' : 'timeGridDay';
               api.changeView(newView);
               setView(newView);
          }
     }, [mdUp]);

     useEffect(() => { handleScreenResize(); }, [mdUp, handleScreenResize]);

     const handleViewChange = useCallback((v: CalendarView) => {
          const el = calendarRef.current; if (!el) return;
          const api = el.getApi(); api.changeView(v); setView(v);
     }, []);

     const handleDateToday = useCallback(() => { const el = calendarRef.current; if (!el) return; const api = el.getApi(); api.today(); setDate(api.getDate()); }, []);
     const handleDatePrev = useCallback(() => { const el = calendarRef.current; if (!el) return; const api = el.getApi(); api.prev(); setDate(api.getDate()); }, []);
     const handleDateNext = useCallback(() => { const el = calendarRef.current; if (!el) return; const api = el.getApi(); api.next(); setDate(api.getDate()); }, []);

     const handleAddClick = useCallback(() => createDialog.handleOpen(), [createDialog]);

     const handleRangeSelect = useCallback((arg: DateSelectArg) => {
          const el = calendarRef.current; if (el) el.getApi().unselect();
          createDialog.handleOpen({ range: { start: arg.start.getTime(), end: arg.end.getTime() } });
     }, [createDialog]);

     const handleEventSelect = useCallback((arg: EventClickArg) => { updateDialog.handleOpen({ eventId: arg.event.id }); }, [updateDialog]);

     const handleEventResize = useCallback(async (arg: EventResizeDoneArg) => {
          const { event } = arg;
          try {
               await (dispatch as any)(thunks.updateEvent({
                    eventId: event.id,
                    update: { allDay: event.allDay, start: event.start?.getTime(), end: event.end?.getTime() },
               }));
          } catch (e) { console.error(e); }
     }, [dispatch]);

     const handleEventDrop = useCallback(async (arg: EventDropArg) => {
          const { event } = arg;
          try {
               await (dispatch as any)(thunks.updateEvent({
                    eventId: event.id,
                    update: { allDay: event.allDay, start: event.start?.getTime(), end: event.end?.getTime() },
               }));
          } catch (e) { console.error(e); }
     }, [dispatch]);

     return (
          <>
               <Stack spacing={3}>
                    {/* Minimal inline toolbar replacement */}
                    <Stack direction="row" spacing={1} alignItems="center">
                         <button onClick={handleAddClick}>Add</button>
                         <button onClick={handleDatePrev}>Prev</button>
                         <button onClick={handleDateToday}>Today</button>
                         <button onClick={handleDateNext}>Next</button>
                         <select value={view} onChange={(e) => handleViewChange(e.target.value as CalendarView)}>
                              <option value="dayGridMonth">Month</option>
                              <option value="timeGridWeek">Week</option>
                              <option value="timeGridDay">Day</option>
                              <option value="listWeek">List</option>
                         </select>
                    </Stack>
                    <Card>
                         <Box sx={{ p: 2 }}>
                              <Calendar
                                   allDayMaintainDuration
                                   dayMaxEventRows={3}
                                   droppable
                                   editable
                                   eventClick={handleEventSelect}
                                   eventDisplay="block"
                                   eventDrop={handleEventDrop}
                                   eventResizableFromStart
                                   eventResize={handleEventResize}
                                   events={events.map(ev => ({
                                        id: ev.id,
                                        title: ev.title,
                                        start: new Date(ev.start_time),
                                        end: new Date(ev.end_time),
                                        allDay: ev.all_day,
                                   }))}
                                   headerToolbar={false}
                                   height={800}
                                   initialDate={date}
                                   initialView={view}
                                   plugins={[dayGridPlugin, interactionPlugin, listPlugin, timeGridPlugin, timelinePlugin]}
                                   ref={calendarRef}
                                   rerenderDelay={10}
                                   select={handleRangeSelect}
                                   selectable
                                   weekends
                              />
                         </Box>
                    </Card>
               </Stack>
               {/* Dialog placeholders */}
               {createDialog.open && <div>Create Event Dialog (range start: {createDialog.data?.range?.start})</div>}
               {updateDialog.open && <div>Update Event Dialog (event: {updatingEvent?.title})</div>}
          </>
     );
};

export default CalendarClient;