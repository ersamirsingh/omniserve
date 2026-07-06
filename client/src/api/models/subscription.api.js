import api from '../axios';

// --- Restaurant Owner Self-Service APIs ---
export const getMySubscriptionApi = () => api.get('/subscriptions/my-subscription');
export const getCurrentSubscriptionApi = getMySubscriptionApi;
export const getUsageApi = () => api.get('/subscriptions/usage');
export const getInvoiceHistoryApi = () => api.get('/subscriptions/invoice-history');
export const upgradeSubscriptionApi = (data) => api.post('/subscriptions/upgrade', data);
export const downgradeSubscriptionApi = (data) => api.post('/subscriptions/downgrade', data);
export const cancelSubscriptionApi = () => api.post('/subscriptions/cancel');
export const resumeSubscriptionApi = () => api.post('/subscriptions/resume');
export const renewSubscriptionApi = () => api.post('/subscriptions/renew');

// --- Super Admin Control Panel APIs ---
export const listPlansApi = () => api.get('/subscriptions/plans');
export const createPlanApi = (data) => api.post('/subscriptions/plans', data);
export const updatePlanApi = (id, data) => api.put(`/subscriptions/plans/${id}`, data);
export const deletePlanApi = (id) => api.delete(`/subscriptions/plans/${id}`);
export const listAllSubscriptionsApi = () => api.get('/subscriptions/admin/list');
export const listAllInvoicesApi = () => api.get('/subscriptions/admin/invoices');
export const getSubscriptionAnalyticsApi = () => api.get('/subscriptions/admin/analytics');
