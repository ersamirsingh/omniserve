import api from '../axios';

export const sendInviteApi = (email, name) => {
  return api.post('/system-admin/invites', { email, name });
};

export const getInvitesApi = () => {
  return api.get('/system-admin/invites');
};

export const revokeInviteApi = (id) => {
  return api.delete(`/system-admin/invites/${id}`);
};

export const acceptInviteApi = (payload) => {
  return api.post('/system-admin/invites/accept', payload);
};

export const listTenantsApi = (params) => {
  return api.get('/system-admin/tenants', { params });
};

export const getTenantDetailApi = (id) => {
  return api.get(`/system-admin/tenants/${id}`);
};

export const updateTenantStatusApi = (id, status, reason) => {
  return api.post(`/system-admin/tenants/${id}/status`, { status, reason });
};

export const overrideSubscriptionApi = (id, payload) => {
  return api.post(`/system-admin/tenants/${id}/subscription/override`, payload);
};

export const deleteTenantApi = (id, reason) => {
  return api.delete(`/system-admin/tenants/${id}`, { data: { reason } });
};

export const searchUsersApi = (search) => {
  return api.get('/system-admin/users/search', { params: { search } });
};

export const getAuditLogsApi = (params) => {
  return api.get('/system-admin/audit-logs', { params });
};

export const getHealthDiagnosticsApi = () => {
  return api.get('/system-admin/health/detailed');
};

export const getHealthStatsApi = () => {
  return api.get('/system-admin/health/stats');
};

export const getSchemaGraphApi = () => {
  return api.get('/system-admin/schema/graph');
};

export const listIssuesApi = () => {
  return api.get('/system-admin/issues');
};

export const createIssueApi = (data) => {
  return api.post('/system-admin/issues', data);
};

export const addIssueCommentApi = (id, message) => {
  return api.post(`/system-admin/issues/${id}/comments`, { message });
};

export const updateIssueStatusApi = (id, data) => {
  return api.post(`/system-admin/issues/${id}/status`, data);
};

export const listSystemAdminsApi = () => {
  return api.get('/system-admin/admins');
};
