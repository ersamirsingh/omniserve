import api from '../axios';

export const listAuditLogsApi = (params) => api.get('/audit-logs', { params });
