import { slice } from 'src/slices/calendar';
import type { AppThunk } from 'src/store';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from 'src/app/actions/calendar/calendar-actions';
import type { CalendarEvent, EventType, UpdateCalendarEventInput } from 'src/types/calendar';
import log from 'src/utils/logger';

const getEvents = (): AppThunk => async (dispatch): Promise<void> => {
     const result = await getCalendarEvents();
     if (result.success) {
          dispatch(slice.actions.getEvents(result.data));
     } else {
          // Optionally dispatch an error slice or log
          log('Failed to fetch calendar events:', 'error');
     }
};

type CreateEventInput = Omit<CalendarEvent, 'id' | 'customerId'>;

const createEvent = (params: CreateEventInput): AppThunk => async (dispatch): Promise<void> => {
     const result = await createCalendarEvent({
          all_day: params.all_day,
          description: params.description,
          end_date_time: params.end_date_time,
          start_date_time: params.start_date_time,
          title: params.title,
          calendar_event_type: params.calendar_event_type,
          building_id: params.building_id ?? null,
          timezone: params.timezone,
     } as CalendarEvent);
     if (result.success) {
          dispatch(slice.actions.createEvent(result.data));
     } else {
          log(`Failed to create calendar event: ${result.error}`, 'error');
     }
};

const updateEvent = (params: UpdateCalendarEventInput): AppThunk => async (dispatch): Promise<void> => {
     const result = await updateCalendarEvent({
          eventId: params.eventId,
          update: {
               all_day: params.update.all_day,
               description: params.update.description,
               end_date_time: params.update.end_date_time,
               start_date_time: params.update.start_date_time,
               title: params.update.title,
               calendar_event_type: params.update.calendar_event_type,
               building_id: params.update.building_id ?? null,
               timezone: params.update.timezone,
          },
     });
     if (result.success) {
          dispatch(slice.actions.updateEvent(result.data));
     } else {
          log(`Failed to update calendar event: ${result.error}`, 'error');
     }
};

type DeleteEventParams = {
     eventId: string;
};

const deleteEvent = (params: DeleteEventParams): AppThunk => async (dispatch): Promise<void> => {
     const result = await deleteCalendarEvent(params.eventId);
     if (result.success) {
          dispatch(slice.actions.deleteEvent(result.data.id));
     } else {
          console.error('Failed to delete calendar event:', result.error);
     }
};

export const thunks = {
     createEvent,
     deleteEvent,
     getEvents,
     updateEvent,
};
