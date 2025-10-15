"use client";
import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
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
     const mdDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
     const smDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
     // dynamic max dots: fewer on very small screens
     const maxDots = smDown ? 4 : mdDown ? 5 : 6;
     const today = new Date(); today.setHours(0, 0, 0, 0);
     return (
          <Box
               sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    border: '1px solid',
                    borderColor: 'divider',
                    userSelect: 'none',
                    fontSize: { xs: '0.75rem', sm: '0.75rem', md: '0.8rem' },
               }}
          >
               {WEEKDAYS.map(d => (
                    <Box key={d} sx={{ p: { xs: 0.75, md: 1 }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                         <Typography variant="caption" fontWeight={600}>{d}</Typography>
                    </Box>
               ))}
               {monthDays.map((day, idx) => {
                    const inMonth = day.getMonth() === month;
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const isPast = day < today;
                    const cellEvents = events.filter(ev => {
                         const ds = new Date(ev.start_date_time);
                         return ds.getFullYear() === day.getFullYear() && ds.getMonth() === day.getMonth() && ds.getDate() === day.getDate();
                    });
                    return (
                         <Box
                              key={idx}
                              role="gridcell"
                              aria-selected={isSelected ? 'true' : 'false'}
                              aria-disabled={isPast ? 'true' : 'false'}
                              onClick={() => { if (!isPast) onSelectDate(day); }}
                              sx={{
                                   cursor: isPast ? 'not-allowed' : 'pointer',
                                   minHeight: { xs: 70, sm: 85, md: 100 },
                                   borderRight: (idx % 7 !== 6) ? '1px solid' : undefined,
                                   borderBottom: (idx < 35) ? '1px solid' : undefined,
                                   borderColor: 'divider',
                                   bgcolor: isSelected ? 'primary.light' : inMonth ? 'background.paper' : 'action.hover',
                                   p: 0.5,
                                   position: 'relative',
                                   opacity: isPast ? 0.5 : 1,
                                   transition: 'background-color 0.15s ease',
                                   '&:hover': { bgcolor: isPast ? undefined : (isSelected ? 'primary.light' : 'action.hover') },
                              }}
                         >
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', fontWeight: isSelected ? 700 : 500, bgcolor: isSelected ? 'primary.main' : 'transparent', color: isSelected ? 'primary.contrastText' : 'text.primary', fontSize: '0.7rem' }}>
                                   {day.getDate()}
                              </Box>
                              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} mt={0.5}>
                                   {cellEvents.slice(0, maxDots).map(ev => (
                                        <Box
                                             key={ev.id}
                                             title={ev.title}
                                             sx={{
                                                  width: 8,
                                                  height: 8,
                                                  borderRadius: '50%',
                                                  bgcolor: eventTypeMeta[ev.calendar_event_type || 'other'].color,
                                                  boxShadow: 1,
                                             }}
                                        />
                                   ))}
                                   {cellEvents.length > maxDots && (
                                        <Typography variant="caption" sx={{ lineHeight: 1 }}>
                                             +{cellEvents.length - maxDots}
                                        </Typography>
                                   )}
                              </Stack>
                         </Box>
                    );
               })}
          </Box>
     );
};

export default MonthGrid;
