import api from '../axios';

export const listMenuItemsApi = (params) => api.get('/menu-items', { params });
export const createMenuItemApi = (data) => api.post('/menu-items', data);
export const getMenuItemByIdApi = (id) => api.get(`/menu-items/${id}`);
export const updateMenuItemApi = (id, data) => api.put(`/menu-items/${id}`, data);
export const toggleAvailabilityApi = (id, isAvailable) => api.patch(`/menu-items/${id}/availability`, { isAvailable });
export const deleteMenuItemApi = (id) => api.delete(`/menu-items/${id}`);
