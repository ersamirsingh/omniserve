import { useSelector, useDispatch } from "react-redux";
import { AuthApi } from "../api/models/auth.api.js";
import {
  setCredentials,
  clearCredentials,
  setLoading,
  setError,
} from "../store/authSlice.js";
import { useCallback, useEffect } from "react";

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, hasCheckedSession, isLoading, error } = useSelector(
    (state) => state.auth
  );

  const login = useCallback(
    async (email, password, rememberMe) => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const response = await AuthApi.login(email, password);
        const { user, accessToken } = response.data;
        dispatch(setCredentials({ user, accessToken, rememberMe }));
        return { success: true, user };
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Login failed";
        dispatch(setError(message));
        return { success: false, message };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const register = useCallback(
    async (email, password, firstName, lastName, tenantName) => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const response = await AuthApi.register(
          email,
          password,
          firstName,
          lastName,
          tenantName
        );
        return { success: true, message: response.message };
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Registration failed";
        dispatch(setError(message));
        return { success: false, message };
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      // Backend handles logout via HTTP-only cookies, but we send empty payload as fallback
      await AuthApi.logout("");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      dispatch(clearCredentials());
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const checkSession = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await AuthApi.getCurrentUser();
      const fetchedUser = response.data;
      const accessToken = response.accessToken || null;
      dispatch(setCredentials({ user: fetchedUser, accessToken }));
      return fetchedUser;
    } catch (err) {
      console.warn("Session check failed, clearing credentials:", err.message);
      dispatch(clearCredentials());
      return null;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // Listener for custom expired session event emitted by axios
  useEffect(() => {
    const handleExpired = () => {
      dispatch(clearCredentials());
    };
    window.addEventListener("auth-session-expired", handleExpired);
    return () => {
      window.removeEventListener("auth-session-expired", handleExpired);
    };
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    hasCheckedSession,
    isLoading,
    error,
    login,
    register,
    logout,
    checkSession,
  };
};

export default useAuth;
