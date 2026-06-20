import api from '../axios';

export const upsertDailyMetricsApi = (data) => api.post('/analytics/daily', data);
export const getDailyStatsApi = (params) => api.get('/analytics/daily', { params });
export const getSummaryStatsApi = (params) => api.get('/analytics/summary', { params });
export const getSentimentSummaryApi = (params) => api.get('/analytics/reviews/sentiment', { params });
export const createReviewApi = (data) => api.post('/analytics/reviews', data);
export const getReviewsApi = (params) => api.get('/analytics/reviews', { params });
export const deleteReviewApi = (id) => api.delete(`/analytics/reviews/${id}`);
