"use client";
import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import type { CalendarEvent, EventType } from 'src/types/calendar';

export interface MonthGridProps {
     year: number;
     month: number; // 0-based
     selectedDate: Date;
     events: CalendarEvent[];
     onSelectDate: (date: Date) => void;
     eventTypeMeta: Record<EventType, { label: string; color: string }>;
}

// Build a 6-week (42 cells) month matrix
function buildMonthDays(year: number, month: number): Date[] {
     const first = new Date(year, month, 1);
     const startDay = first.getDay();
     const days: Date[] = [];
     for (let i = 0; i < startDay; i++) days.push(new Date(year, month, i - startDay + 1));
     const lastDate = new Date(year, month + 1, 0).getDate();
     for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
     while (days.length < 42) {
          const nextIndex = days.length - (startDay + lastDate) + 1;
          days.push(new Date(year, month + 1, nextIndex));
     }
     return days;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MonthGrid: React.FC<MonthGridProps> = ({ year, month, selectedDate, events, onSelectDate, eventTypeMeta }) => {
     const monthDays = useMemo(() => buildMonthDays(year, month), [year, month]);
     return (
          <>
               <Box
                    sx={{
                         display: 'grid',
                         gridTemplateColumns: 'repeat(7, 1fr)',
                         border: '1px solid',
                         borderColor: 'divider',
                         userSelect: 'none',
                    }}
               >
                    {WEEKDAYS.map(d => (
                         <Box key={d} sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                              <Typography variant="caption" fontWeight={600}>{d}</Typography>
                         </Box>
                    ))}
                    {monthDays.map((day, idx) => {
                         const inMonth = day.getMonth() === month;
                         const isSelected = day.toDateString() === selectedDate.toDateString();
                         const cellEvents = events.filter(ev => {
                              const ds = new Date(ev.start_date_time);
                              return ds.getFullYear() === day.getFullYear() && ds.getMonth() === day.getMonth() && ds.getDate() === day.getDate();
                         });
                         return (
                              <Box
                                   key={idx}
                                   onClick={() => onSelectDate(day)}
                                   sx={{
                                        cursor: 'pointer',
                                        minHeight: 100,
                                        borderRight: (idx % 7 !== 6) ? '1px solid' : undefined,
                                        borderBottom: (idx < 35) ? '1px solid' : undefined,
                                        borderColor: 'divider',
                                        bgcolor: isSelected ? 'primary.light' : inMonth ? 'background.paper' : 'action.hover',
                                        p: 0.5,
                                        position: 'relative',
                                   }}
                              >
                                   <Typography variant="caption" fontWeight={isSelected ? 700 : 400}>{day.getDate()}</Typography>
                                   <Stack spacing={0.5} mt={0.5}>
                                        {cellEvents.slice(0, 3).map(ev => (
                                             <Chip key={ev.id} size="small" label={ev.title} sx={{ bgcolor: eventTypeMeta[ev.calendar_event_type || 'other'].color, color: '#fff' }} />
                                        ))}
                                        {cellEvents.length > 3 && <Typography variant="caption">+{cellEvents.length - 3} more</Typography>}
                                   </Stack>
                              </Box>
                         );
                    })}
               </Box>
          </>
     );
};

export default MonthGrid;
