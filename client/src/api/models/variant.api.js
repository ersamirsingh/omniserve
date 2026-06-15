import api from '../axios';

export const listVariantsApi = (params) => api.get('/variants', { params });
export const createVariantApi = (data) => api.post('/variants', data);
export const getVariantByIdApi = (id) => api.get(`/variants/${id}`);
export const updateVariantApi = (id, data) => api.put(`/variants/${id}`, data);
export const deleteVariantApi = (id) => api.delete(`/variants/${id}`);
