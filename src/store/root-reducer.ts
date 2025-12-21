import { combineReducers } from '@reduxjs/toolkit';

import { reducer as calendarReducer } from 'src/slices/calendar';
import { reducer as kanbanReducer } from 'src/slices/kanban';

export const rootReducer = combineReducers({
  calendar: calendarReducer,
  kanban: kanbanReducer,
});
