import axios from 'axios';

const DINEIN_BASE_URL = import.meta.env.VITE_DINEIN_API_URL || '/api/v1';
const DINEIN_SCOPE_STORAGE_KEY = 'foodmesh.dinein.scope';

const dineinApi = axios.create({
  baseURL: DINEIN_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

dineinApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sessionToken');
    if (token) {
      config.headers['x-session-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const readStoredScope = () => {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(localStorage.getItem(DINEIN_SCOPE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const buildScopedConfig = (scope = {}, config = {}) => {
  const storedScope = readStoredScope();
  const resolvedScope = { ...storedScope, ...scope };

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      ...(resolvedScope.tenantId ? { 'x-tenant-id': resolvedScope.tenantId } : {}),
      ...(resolvedScope.outletId ? { 'x-outlet-id': resolvedScope.outletId } : {}),
      ...(resolvedScope.userId ? { 'x-user-id': resolvedScope.userId } : {}),
      ...(resolvedScope.userRole ? { 'x-user-role': resolvedScope.userRole } : {}),
      ...(resolvedScope.userEmail ? { 'x-user-email': resolvedScope.userEmail } : {}),
    },
  };
};

export const extractApiData = (response) => response?.data?.data ?? response?.data ?? null;

export const listDineInFloorMapApi = (scope) =>
  dineinApi.get('/floor/map', buildScopedConfig(scope));
export const createDineInFloorApi = (scope, data) =>
  dineinApi.post('/floor/floors', data, buildScopedConfig(scope));
export const createDineInSectionApi = (scope, data) =>
  dineinApi.post('/floor/sections', data, buildScopedConfig(scope));

export const listDineInTablesApi = (scope) =>
  dineinApi.get('/tables', buildScopedConfig(scope));
export const createDineInTableApi = (scope, data) =>
  dineinApi.post('/tables', data, buildScopedConfig(scope));
export const updateDineInTableApi = (scope, tableId, data) =>
  dineinApi.patch(`/tables/${tableId}`, data, buildScopedConfig(scope));
export const moveDineInTableApi = (scope, tableId, data) =>
  dineinApi.patch(`/tables/${tableId}/move`, data, buildScopedConfig(scope));
export const updateDineInTableStatusApi = (scope, tableId, data) =>
  dineinApi.patch(`/tables/${tableId}/status`, data, buildScopedConfig(scope));
export const releaseDineInTableApi = (scope, tableId) =>
  dineinApi.patch(`/tables/${tableId}/release`, {}, buildScopedConfig(scope));
export const assignDineInWaiterApi = (scope, tableId, data) =>
  dineinApi.patch(`/tables/${tableId}/assign-waiter`, data, buildScopedConfig(scope));
export const transferDineInWaiterApi = (scope, tableId, data) =>
  dineinApi.patch(`/tables/${tableId}/transfer-waiter`, data, buildScopedConfig(scope));
export const lockDineInTableApi = (scope, tableId, data) =>
  dineinApi.patch(`/tables/${tableId}/lock`, data, buildScopedConfig(scope));
export const unlockDineInTableApi = (scope, tableId) =>
  dineinApi.patch(`/tables/${tableId}/unlock`, {}, buildScopedConfig(scope));

export const listDineInSessionsApi = (scope) =>
  dineinApi.get('/sessions', buildScopedConfig(scope));
export const openDineInSessionApi = (scope, data) =>
  dineinApi.post('/sessions', data, buildScopedConfig(scope));
export const getDineInSessionApi = (scope, sessionId) =>
  dineinApi.get(`/sessions/${sessionId}`, buildScopedConfig(scope));
export const joinDineInSessionApi = (scope, sessionId, data) =>
  dineinApi.post(`/sessions/${sessionId}/join`, data, buildScopedConfig(scope));
export const closeDineInSessionApi = (scope, sessionId, data = {}) =>
  dineinApi.patch(`/sessions/${sessionId}/close`, data, buildScopedConfig(scope));

export const listDineInReservationsApi = (scope) =>
  dineinApi.get('/reservations', buildScopedConfig(scope));
export const createDineInReservationApi = (scope, data) =>
  dineinApi.post('/reservations', data, buildScopedConfig(scope));
export const confirmDineInReservationApi = (scope, reservationId, data) =>
  dineinApi.patch(`/reservations/${reservationId}/confirm`, data, buildScopedConfig(scope));
export const cancelDineInReservationApi = (scope, reservationId, data) =>
  dineinApi.patch(`/reservations/${reservationId}/cancel`, data, buildScopedConfig(scope));

export const listDineInOrdersApi = (scope) =>
  dineinApi.get('/orders', buildScopedConfig(scope));
export const createDineInOrderApi = (scope, data) =>
  dineinApi.post('/orders', data, buildScopedConfig(scope));
export const updateDineInOrderStatusApi = (scope, orderId, data) =>
  dineinApi.patch(`/orders/${orderId}/status`, data, buildScopedConfig(scope));

export const listDineInAssistanceApi = (scope) =>
  dineinApi.get('/assistance', buildScopedConfig(scope));
export const createDineInAssistanceApi = (scope, data) =>
  dineinApi.post('/assistance', data, buildScopedConfig(scope));
export const resolveDineInAssistanceApi = (scope, requestId, data = {}) =>
  dineinApi.patch(`/assistance/${requestId}/resolve`, data, buildScopedConfig(scope));

export const generateDineInBillApi = (scope, data) =>
  dineinApi.post('/billing/generate', data, buildScopedConfig(scope));
export const getDineInBillBySessionApi = (scope, sessionId) =>
  dineinApi.get(`/billing/session/${sessionId}`, buildScopedConfig(scope));
export const recordDineInPaymentApi = (scope, billId, data) =>
  dineinApi.patch(`/billing/${billId}/payment`, data, buildScopedConfig(scope));
