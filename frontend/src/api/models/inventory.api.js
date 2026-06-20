import api from '../axios';

export const listInventoryApi = (params) => api.get('/inventory', { params });
export const createInventoryApi = (data) => api.post('/inventory', data);
export const getInventoryByIdApi = (id) => api.get(`/inventory/${id}`);
export const updateInventoryApi = (id, data) => api.put(`/inventory/${id}`, data);
export const updateInventoryQuantityApi = (id, quantity) => api.patch(`/inventory/${id}/quantity`, { quantity });
export const deleteInventoryApi = (id) => api.delete(`/inventory/${id}`);
