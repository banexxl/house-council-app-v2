import { combineReducers } from '@reduxjs/toolkit';

import { reducer as calendarReducer } from 'src/slices/calendar';
import { reducer as chatReducer } from 'src/slices/chat';
import { reducer as boardReducer } from 'src/slices/board';
import { reducer as mailReducer } from 'src/slices/mail';

export const rootReducer = combineReducers({
          calendar: calendarReducer,
          chat: chatReducer,
          board: boardReducer,
          mail: mailReducer,
});
