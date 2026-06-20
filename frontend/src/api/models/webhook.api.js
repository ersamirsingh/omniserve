import api from '../axios';

export const listWebhooksApi = (params) => api.get('/webhooks/logs', { params });
export const retryWebhookApi = (id) => api.post(`/webhooks/logs/${id}/retry`);
