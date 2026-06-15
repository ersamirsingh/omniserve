import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice.js";
import notificationReducer from "./notificationSlice.js";
import orderReducer from "./orderSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationReducer,
    orders: orderReducer,
  },
});

export default store;
