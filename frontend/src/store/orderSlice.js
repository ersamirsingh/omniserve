import { createSlice } from "@reduxjs/toolkit";
import { OrderStatus } from "../utils/constants.js";

const initialState = {
  orders: [],
  activeOrdersCount: 0,
  isLoading: false,
  error: null,
};

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrders: (state, action) => {
      state.orders = action.payload;
      state.activeOrdersCount = action.payload.filter(
        (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
      ).length;
    },
    addOrderToList: (state, action) => {
      state.orders.unshift(action.payload);
      if (
        action.payload.status !== OrderStatus.DELIVERED &&
        action.payload.status !== OrderStatus.CANCELLED
      ) {
        state.activeOrdersCount += 1;
      }
    },
    updateOrderInList: (state, action) => {
      const index = state.orders.findIndex((o) => o._id === action.payload._id);
      if (index !== -1) {
        const wasActive =
          state.orders[index].status !== OrderStatus.DELIVERED &&
          state.orders[index].status !== OrderStatus.CANCELLED;
        
        state.orders[index] = action.payload;
        
        const isActiveNow =
          action.payload.status !== OrderStatus.DELIVERED &&
          action.payload.status !== OrderStatus.CANCELLED;

        if (wasActive && !isActiveNow) {
          state.activeOrdersCount = Math.max(0, state.activeOrdersCount - 1);
        } else if (!wasActive && isActiveNow) {
          state.activeOrdersCount += 1;
        }
      }
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setOrders, addOrderToList, updateOrderInList, setLoading, setError } =
  orderSlice.actions;

export default orderSlice.reducer;
