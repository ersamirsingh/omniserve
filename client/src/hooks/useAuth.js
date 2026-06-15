import { useSelector, useDispatch } from 'react-redux';
import { loginUser, registerUser, logoutUser, fetchCurrentUser, clearError } from '../store/authSlice';
import { useCallback } from 'react';

export default function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector((s) => s.auth);

  const login = useCallback((creds) => dispatch(loginUser(creds)), [dispatch]);
  const register = useCallback((data) => dispatch(registerUser(data)), [dispatch]);
  const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);
  const fetchMe = useCallback(() => dispatch(fetchCurrentUser()), [dispatch]);
  const clearErr = useCallback(() => dispatch(clearError()), [dispatch]);

  return { user, isAuthenticated, loading, error, login, register, logout, fetchMe, clearErr };
}
