import api from '../axios';

export const getDailyStatsApi = (params) => api.get('/analytics/daily', { params });
export const getSummaryStatsApi = (params) => api.get('/analytics/summary', { params });
export const getSentimentSummaryApi = (params) => api.get('/analytics/reviews/sentiment', { params });
export const getExtendedStatsApi = (params) => api.get('/analytics/extended', { params });
