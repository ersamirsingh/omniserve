import api from '../axios';

export const listPaymentsApi = (params) => api.get('/payments', { params });
export const createPaymentApi = (data) => api.post('/payments', data);
export const getPaymentByIdApi = (id) => api.get(`/payments/${id}`);
export const updatePaymentApi = (id, data) => api.patch(`/payments/${id}`, data);
export const refundPaymentApi = (id, data) => api.patch(`/payments/${id}/refund`, data);
