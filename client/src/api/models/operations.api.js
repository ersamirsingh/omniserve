import api from '../axios';

// --- Dining Operations ---
export const executeDiningOperationApi = (data) => api.post('/dining/operations', data);
export const updateTablesLayoutApi = (data) => api.put('/dining/tables/layout', data);
export const getUnifiedTimelineApi = (sessionId) => api.get(`/dining/timeline/${sessionId}`);

// --- Tables & Dining Areas (General queries & CRUD) ---
export const getTablesApi = (params) => api.get('/dining/tables', { params });
export const createTableApi = (data) => api.post('/dining/tables', data);
export const updateTableApi = (id, data) => api.patch(`/dining/tables/${id}`, data);
export const archiveTableApi = (id) => api.delete(`/dining/tables/${id}`);

export const getDiningAreasApi = (params) => api.get('/dining/areas', { params });
export const createDiningAreaApi = (data) => api.post('/dining/areas', data);
export const updateDiningAreaApi = (id, data) => api.patch(`/dining/areas/${id}`, data);
export const archiveDiningAreaApi = (id) => api.delete(`/dining/areas/${id}`);

// --- KDS (Kitchen Display System) ---
export const getKdsQueueApi = (params) => api.get('/kds/queue', { params });
export const holdKdsItemApi = (itemId, data) => api.post(`/kds/items/${itemId}/hold`, data);
export const fireKdsItemApi = (itemId, data) => api.post(`/kds/items/${itemId}/fire`, data);
export const fireKdsCourseApi = (orderId, data) => api.post(`/kds/orders/${orderId}/fire-course`, data);
export const updateKdsItemStationApi = (itemId, data) => api.patch(`/kds/items/${itemId}/station`, data);

// --- Billing ---
export const requestBillApi = (sessionId, data) => api.post(`/billing/sessions/${sessionId}/request`, data);
export const getSessionBillApi = (sessionId) => api.get(`/billing/sessions/${sessionId}`);
export const splitBillApi = (billSessionId, data) => api.post(`/billing/${billSessionId}/split`, data);
export const settleBillApi = (billSessionId, data) => api.post(`/billing/${billSessionId}/settle`, data);

// --- Shifts ---
export const openShiftApi = (data) => api.post('/shifts/open', data);
export const closeShiftApi = (shiftId, data) => api.post(`/shifts/${shiftId}/close`, data);
export const getCurrentShiftApi = (params) => api.get('/shifts/current', { params });
export const getShiftHistoryApi = (params) => api.get('/shifts/history', { params });

// --- Reservations ---
export const getReservationsApi = (params) => api.get('/reservations', { params });
export const createReservationApi = (data) => api.post('/reservations', data);
export const confirmReservationApi = (reservationId) => api.post(`/reservations/${reservationId}/confirm`);
export const seatReservationApi = (reservationId, data) => api.post(`/reservations/${reservationId}/seat`, data);
export const markReservationNoShowApi = (reservationId) => api.post(`/reservations/${reservationId}/no-show`);
export const cancelReservationApi = (reservationId, data) => api.post(`/reservations/${reservationId}/cancel`, data);

// --- Dining Analytics ---
export const getDiningAnalyticsSummaryApi = (params) => api.get('/dining-analytics/summary', { params });
export const getWaiterTasksApi = (params) => api.get('/dining/waiter-tasks', { params });
export const rotateTableQrTokenApi = (tableId) => api.post(`/dining/tables/${tableId}/rotate-qr`);
export const holdTableApi = (tableId) => api.post(`/dining/tables/${tableId}/hold`);
