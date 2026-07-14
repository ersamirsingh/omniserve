import api from '../axios';

export const loginApi = (data) => api.post('/auth/login', data);
export const registerApi = (data) => api.post('/auth/register', data);
export const logoutApi = () => {
  const refreshToken = localStorage.getItem('refreshToken');
  return api.post('/auth/logout', { refreshToken });
};
export const getMeApi = () => api.get('/auth/me');
export const changePasswordApi = (data) => api.post('/auth/change-password', data);
