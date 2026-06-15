import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      const list = Array.isArray(action.payload)
        ? action.payload
        : action.payload?.notifications || [];
      state.notifications = list;
      state.unreadCount = list.filter((n) => !n.isRead).length;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    markRead: (state, action) => {
      const notification = state.notifications.find((n) => n._id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead: (state) => {
      state.notifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      const notificationIndex = state.notifications.findIndex((n) => n._id === action.payload);
      if (notificationIndex !== -1) {
        const wasUnread = !state.notifications[notificationIndex].isRead;
        state.notifications.splice(notificationIndex, 1);
        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markRead,
  markAllRead,
  removeNotification,
  setLoading,
} = notificationSlice.actions;

export default notificationSlice.reducer;
