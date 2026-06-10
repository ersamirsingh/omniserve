import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  stats: null,
  revenue: [],
  recentOrders: [],
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboardData: (state, action) => {
      state.stats = action.payload.stats;
      state.revenue = action.payload.revenue;
      state.recentOrders = action.payload.recentOrders;
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setDashboardData,
  setLoading,
  setError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;