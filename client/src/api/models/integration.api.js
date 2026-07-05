import api from '../axios';

export const getMappingsHealthApi = (params) => api.get('/v1/integrations/mappings/health', { params });
export const getUnmappedItemsApi = (provider, params) => api.get('/v1/integrations/mappings/unmapped', { params: { ...params, provider } });
export const getExternalOrdersApi = (params) => api.get('/v1/integrations/external-orders', { params });
export const replayOrderApi = (id, params) => api.post(`/v1/integrations/external-orders/${id}/replay`, {}, { params });

// Mock provider simulators (n8n/Postman equivalent inside Dashboard!)
export const simulateMockSwiggyOrderApi = (payload, params) => api.post('/v1/integrations/mock/swiggy/orders', payload, { params });
export const simulateMockZomatoOrderApi = (payload, params) => api.post('/v1/integrations/mock/zomato/orders', payload, { params });

// Phase 7 Event Bus & Sync Engine
export const getIntegrationStatsApi = (params) => api.get('/v1/integrations/stats', { params });
export const getIntegrationEventsApi = (params) => api.get('/v1/integrations/events', { params });
export const getSyncJobsApi = (params) => api.get('/v1/integrations/sync-jobs', { params });
export const replayEventApi = (id, params) => api.post(`/v1/integrations/events/${id}/replay`, {}, { params });
