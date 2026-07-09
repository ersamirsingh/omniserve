import api from '../axios';

export const listUsersApi = (params) => api.get('/users', { params });
export const createUserApi = (data) => api.post('/users', data);
export const updateUserApi = (id, data) => api.put(`/users/${id}`, data);
export const deleteUserApi = (id) => api.delete(`/users/${id}`);
export const acceptMyInvitationApi = () => api.patch('/users/me/accept-invitation');
export const getProfileContextApi = () => api.get('/users/me/profile-context');
