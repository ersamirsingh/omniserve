import api from '../axios';

export const createHelpRequestApi = (data) => api.post('/help-requests', data);
export const listHelpRequestsApi = () => api.get('/help-requests');
export const resolveHelpRequestApi = (id, data) => api.patch(`/help-requests/${id}`, data);
