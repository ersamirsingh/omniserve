import api from '../axios';

export const listNotificationsApi = (params) => api.get('/notifications', { params });
export const markReadApi = (id) => api.patch(`/notifications/${id}/read`);
export const markAllReadApi = () => api.patch('/notifications/read-all');
