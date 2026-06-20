import api from '../axios';

export const listUsersApi = (params) => api.get('/users', { params });
export const createUserApi = (data) => api.post('/users', data);
export const getUserByIdApi = (id) => api.get(`/users/${id}`);
export const updateUserApi = (id, data) => api.put(`/users/${id}`, data);
export const deleteUserApi = (id) => api.delete(`/users/${id}`);
export const acceptMyInvitationApi = () => api.patch('/users/me/accept-invitation');
