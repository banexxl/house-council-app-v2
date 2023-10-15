export interface CalendarEvent {
          _id: string;
          allDay: boolean;
          color?: string;
          description: string;
          end: number;
          start: number;
          title: string;
}

export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
