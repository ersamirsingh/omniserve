import api from '../axios';

export const listAddonsApi = (params) => api.get('/addons', { params });
export const createAddonApi = (data) => api.post('/addons', data);
export const getAddonByIdApi = (id) => api.get(`/addons/${id}`);
export const updateAddonApi = (id, data) => api.put(`/addons/${id}`, data);
export const deleteAddonApi = (id) => api.delete(`/addons/${id}`);
