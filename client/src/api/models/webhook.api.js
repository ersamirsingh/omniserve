import api from '../axios';

export const listWebhooksApi = (params) => api.get('/webhooks', { params });
export const createWebhookApi = (data) => api.post('/webhooks', data);
export const retryWebhookApi = (id) => api.post(`/webhooks/${id}/retry`);
