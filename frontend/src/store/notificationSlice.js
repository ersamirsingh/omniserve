import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listNotificationsApi, markReadApi, markAllReadApi } from '../api/models/notification.api';

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await listNotificationsApi(params);
    // console.log(res.data.data)
    return res.data.data.notifications;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch notifications');
  }
});

export const markAsRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await markReadApi(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to mark as read');
  }
});

export const markAllAsRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await markAllReadApi();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed');
  }
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: 'idle',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => { state.loading = 'pending'; })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        const list = Array.isArray(action.payload) ? action.payload : [];
        state.notifications = list;
        state.unreadCount = list.filter((n) => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (state) => { state.loading = 'failed'; })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const n = state.notifications.find((x) => (x.id || x._id) === action.payload);
        if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((n) => { n.isRead = true; });
        state.unreadCount = 0;
      });
  },
});

export default notificationSlice.reducer;
