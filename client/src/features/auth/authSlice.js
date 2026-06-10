import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,

  accessToken:
    localStorage.getItem("accessToken") || null,

  refreshToken:
    localStorage.getItem("refreshToken") || null,

  permissions: [],

  isAuthenticated: !!localStorage.getItem(
    "accessToken"
  ),

  loading: false,

  error: null,
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {

    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    setUser: (state, action) => {
      const {
        user,
        accessToken,
        refreshToken,
      } = action.payload;

      state.user = user;

      state.accessToken = accessToken;

      state.refreshToken = refreshToken;

      state.permissions =
        user?.permissions || [];

      state.isAuthenticated = true;

      state.loading = false;

      state.error = null;

      localStorage.setItem(
        "accessToken",
        accessToken
      );

      if (refreshToken) {
        localStorage.setItem(
          "refreshToken",
          refreshToken
        );
      }
    },

    // ========================
    // UPDATE USER PROFILE
    // ========================

    updateUser: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },

    // ========================
    // UPDATE PERMISSIONS
    // ========================

    setPermissions: (
      state,
      action
    ) => {
      state.permissions =
        action.payload || [];
    },

    // ========================
    // UPDATE TOKEN
    // ========================

    updateTokens: (
      state,
      action
    ) => {
      const {
        accessToken,
        refreshToken,
      } = action.payload;

      if (accessToken) {
        state.accessToken =
          accessToken;

        localStorage.setItem(
          "accessToken",
          accessToken
        );
      }

      if (refreshToken) {
        state.refreshToken =
          refreshToken;

        localStorage.setItem(
          "refreshToken",
          refreshToken
        );
      }
    },

    // ========================
    // AUTH FAILURE
    // ========================

    authFailure: (
      state,
      action
    ) => {
      state.loading = false;

      state.error =
        action.payload ||
        "Something went wrong";
    },

    // ========================
    // CLEAR ERROR
    // ========================

    clearAuthError: (
      state
    ) => {
      state.error = null;
    },

    // ========================
    // LOGOUT
    // ========================

    logout: (state) => {
      state.user = null;

      state.accessToken = null;

      state.refreshToken = null;

      state.permissions = [];

      state.isAuthenticated = false;

      state.loading = false;

      state.error = null;

      localStorage.removeItem(
        "accessToken"
      );

      localStorage.removeItem(
        "refreshToken"
      );
    },
  },
});

export const {
  authStart,
  setUser,
  updateUser,
  setPermissions,
  updateTokens,
  authFailure,
  clearAuthError,
  logout,
} = authSlice.actions;

export default authSlice.reducer;