import { slice } from 'src/slices/calendar';
import type { AppThunk } from 'src/store';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from 'src/app/actions/calendar/calendar-actions';

const getEvents = (): AppThunk => async (dispatch): Promise<void> => {
     const result = await getCalendarEvents();
     if (result.success) {
          dispatch(slice.actions.getEvents(result.data));
     } else {
          // Optionally dispatch an error slice or log
          console.error('Failed to fetch calendar events:', result.error);
     }
};

type CreateEventParams = {
     allDay: boolean;
     description: string;
     end: number;
     start: number;
     title: string;
};

const createEvent = (params: CreateEventParams): AppThunk => async (dispatch): Promise<void> => {
     const result = await createCalendarEvent({
          all_day: params.allDay,
          description: params.description,
          end_time: params.end,
          start_time: params.start,
          title: params.title,
     });
     if (result.success) {
          dispatch(slice.actions.createEvent(result.data));
     } else {
          console.error('Failed to create calendar event:', result.error);
     }
};

type UpdateEventParams = {
     eventId: string;
     update: {
          allDay?: boolean;
          description?: string;
          end?: number;
          start?: number;
          title?: string;
     };
};

const updateEvent = (params: UpdateEventParams): AppThunk => async (dispatch): Promise<void> => {
     const result = await updateCalendarEvent({
          eventId: params.eventId,
          update: {
               all_day: params.update.allDay,
               description: params.update.description,
               end_time: params.update.end,
               start_time: params.update.start,
               title: params.update.title,
          },
     });
     if (result.success) {
          dispatch(slice.actions.updateEvent(result.data));
     } else {
          console.error('Failed to update calendar event:', result.error);
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
