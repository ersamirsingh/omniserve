import api from '../axios';

export const listOutletsApi = (params) => api.get('/outlets', { params });
export const createOutletApi = (data) => api.post('/outlets', data);
export const getOutletByIdApi = (id) => api.get(`/outlets/${id}`);
export const updateOutletApi = (id, data) => api.put(`/outlets/${id}`, data);
export const toggleOutletStatusApi = (id) => api.patch(`/outlets/${id}/status`);
export const updateOperatingHoursApi = (id, data) => api.patch(`/outlets/${id}/operating-hours`, data);
export const deleteOutletApi = (id) => api.delete(`/outlets/${id}`);
export const findNearbyOutletsApi = (params) => api.get('/outlets/nearby', { params });
