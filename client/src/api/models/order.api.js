import api from '../axios';

export const listOrdersApi = (params) => api.get('/orders', { params });
export const placeOrderApi = (data) => api.post('/orders', data);
export const getOrderByIdApi = (id) => api.get(`/orders/${id}`);
export const updateOrderStatusApi = (id, data) => api.patch(`/orders/${id}/status`, data);
export const cancelOrderApi = (id) => api.patch(`/orders/${id}/cancel`);
export const listOrderItemsApi = (id) => api.get(`/orders/${id}/items`);
export const addItemToOrderApi = (id, data) => api.post(`/orders/${id}/items`, data);
export const deleteOrderApi = (id) => api.delete(`/orders/${id}`);
