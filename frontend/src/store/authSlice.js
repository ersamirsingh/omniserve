import { createSlice } from "@reduxjs/toolkit";

const initialUser = (() => {
  try {
    const userStr = sessionStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
})();

const initialState = {
  user: initialUser,
  accessToken: sessionStorage.getItem("accessToken") || null,
  isAuthenticated: !!sessionStorage.getItem("accessToken"),
  hasCheckedSession: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, rememberMe } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      state.hasCheckedSession = true;
      state.error = null;
      
      if (accessToken) {
        sessionStorage.setItem("accessToken", accessToken);
      }
      if (user) {
        sessionStorage.setItem("user", JSON.stringify(user));
      }
      
      if (rememberMe !== undefined) {
        localStorage.setItem("foodmesh_remember_me", rememberMe ? "true" : "false");
        if (rememberMe && user?.email) {
          localStorage.setItem("foodmesh_remembered_email", user.email);
        } else {
          localStorage.removeItem("foodmesh_remembered_email");
        }
      }
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.hasCheckedSession = true;
      state.error = null;
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("user");
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSessionChecked: (state) => {
      state.hasCheckedSession = true;
    }
  },
});

export const { setCredentials, clearCredentials, setLoading, setError, setSessionChecked } = authSlice.actions;
export default authSlice.reducer;
