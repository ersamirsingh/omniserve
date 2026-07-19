import api from '../axios';

// --- Restaurant Owner Self-Service APIs ---
export const getMySubscriptionApi = (params) => api.get('/subscriptions/my-subscription', { params });
export const getCurrentSubscriptionApi = getMySubscriptionApi;
export const getUsageApi = (params) => api.get('/subscriptions/usage', { params });
export const getInvoiceHistoryApi = (params) => api.get('/subscriptions/invoice-history', { params });
export const upgradeSubscriptionApi = (data) => api.post('/subscriptions/upgrade', data);
export const downgradeSubscriptionApi = (data) => api.post('/subscriptions/downgrade', data);
export const cancelSubscriptionApi = () => api.post('/subscriptions/cancel');
export const resumeSubscriptionApi = () => api.post('/subscriptions/resume');
export const renewSubscriptionApi = (data) => api.post('/subscriptions/renew', data);
export const validateSubscriptionCouponApi = (code, subtotal) => 
  api.post('/subscriptions/validate-coupon', { code, subtotal });

// --- Super Admin Control Panel APIs ---
export const listPlansApi = (params) => api.get('/subscriptions/plans', { params });
export const createPlanApi = (data) => api.post('/subscriptions/plans', data);
export const updatePlanApi = (id, data) => api.put(`/subscriptions/plans/${id}`, data);
export const deletePlanApi = (id) => api.delete(`/subscriptions/plans/${id}`);
export const listAllSubscriptionsApi = (params) => api.get('/subscriptions/admin/list', { params });
export const listAllInvoicesApi = (params) => api.get('/subscriptions/admin/invoices', { params });
export const getSubscriptionAnalyticsApi = (params) => api.get('/subscriptions/admin/analytics', { params });
