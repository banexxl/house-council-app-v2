export interface CalendarEvent {
  id: string;
  all_day: boolean;
  color?: string;
  description: string;
  end_time: number;
  start_time: number;
  title: string;
  client_id: string;
}

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
