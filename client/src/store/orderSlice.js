import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listOrdersApi, updateOrderStatusApi, cancelOrderApi } from '../api/models/order.api';

export const fetchOrders = createAsyncThunk('orders/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await listOrdersApi(params);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
  }
});

export const updateOrderStatus = createAsyncThunk('orders/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const res = await updateOrderStatusApi(id, { status });
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update status');
  }
});

export const cancelOrder = createAsyncThunk('orders/cancel', async (id, { rejectWithValue }) => {
  try {
    const res = await cancelOrderApi(id);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to cancel order');
  }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    orders: [],
    selectedOrder: null,
    loading: 'idle',
    error: null,
  },
  reducers: {
    setSelectedOrder(state, action) { state.selectedOrder = action.payload; },
    clearOrders(state) { state.orders = []; state.selectedOrder = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = 'pending'; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.orders = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = 'failed';
        state.error = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        if (action.payload?._id) {
          const idx = state.orders.findIndex((o) => o._id === action.payload._id);
          if (idx !== -1) state.orders[idx] = action.payload;
        }
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        if (action.payload?._id) {
          const idx = state.orders.findIndex((o) => o._id === action.payload._id);
          if (idx !== -1) state.orders[idx] = action.payload;
        }
      });
  },
});

export const { setSelectedOrder, clearOrders } = orderSlice.actions;
export default orderSlice.reducer;
