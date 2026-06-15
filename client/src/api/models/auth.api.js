import api from '../axios';

export const loginApi = (data) => api.post('/auth/login', data);
export const registerApi = (data) => api.post('/auth/register', data);
export const logoutApi = () => api.post('/auth/logout');
export const refreshApi = () => api.post('/auth/refresh');
export const getMeApi = () => api.get('/auth/me');
export const changePasswordApi = (data) => api.post('/auth/change-password', data);
export const revokeAllApi = () => api.post('/auth/revoke-all');
export const verifyTokenApi = (token) => api.post('/auth/verify', null, { headers: { Authorization: `Bearer ${token}` } });
