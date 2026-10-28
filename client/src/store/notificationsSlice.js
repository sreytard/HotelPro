import { createSlice } from '@reduxjs/toolkit';

// In-app notifications shown by the bell in the navbar
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unread: 0 },
  reducers: {
    setNotifications(state, action) {
      state.items = action.payload.items;
      state.unread = action.payload.unread;
    },
    clearNotifications(state) {
      state.items = [];
      state.unread = 0;
    },
  },
});

export const { setNotifications, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
