export interface CalendarEvent {
  id: string;
  created_at: string;
  all_day: boolean;
  color?: string;
  description: string;
  end_date_time: string;
  start_date_time: string;
  title: string;
  customerId: string;
  calendar_event_type?: EventType;
  building_id?: string | null;
  timezone: string;
}

export interface UpdateCalendarEventInput {
  eventId: string;
  update: Partial<Pick<CalendarEvent, 'all_day' | 'description' | 'end_date_time' | 'start_date_time' | 'title' | 'color' | 'calendar_event_type' | 'building_id' | 'timezone'>>;
}

export type EventType = 'appointment' | 'meeting' | 'reminder' | 'task' | 'holiday' | 'other';

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

// Formik/Yup helpers for calendar event creation/editing
export interface CalendarEventFormValues {
  title: string;
  description: string;
  calendar_event_type: EventType;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  building_id: string;
  timezone: string;
}

export const CALENDAR_EVENT_INITIAL_VALUES: CalendarEventFormValues = {
  title: '',
  description: '',
  calendar_event_type: 'meeting',
  startTime: '09:00',
  endTime: '10:00',
  building_id: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};
