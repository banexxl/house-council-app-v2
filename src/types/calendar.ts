export interface CalendarEvent {
  id: string;
  all_day: boolean;
  color?: string;
  description: string;
  end_date_time: number;
  start_date_time: number;
  title: string;
  client_id: string;
  calendar_event_type?: EventType;
  building_id?: string | null;
}

export interface UpdateCalendarEventInput {
  eventId: string;
  update: Partial<Pick<CalendarEvent, 'all_day' | 'description' | 'end_date_time' | 'start_date_time' | 'title' | 'color' | 'calendar_event_type' | 'building_id'>>;
}

export type EventType = 'appointment' | 'meeting' | 'reminder' | 'task' | 'holiday' | 'other';

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
