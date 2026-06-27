import api from '../axios';

const DINEIN_BASE_URL = import.meta.env.VITE_DINEIN_API_URL || '/api/v1';
const DINEIN_SCOPE_STORAGE_KEY = 'foodmesh.dinein.scope';

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
  api.get(`${DINEIN_BASE_URL}/floor/map`, buildScopedConfig(scope));
export const createDineInFloorApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/floor/floors`, data, buildScopedConfig(scope));
export const createDineInSectionApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/floor/sections`, data, buildScopedConfig(scope));

export const listDineInTablesApi = (scope) =>
  api.get(`${DINEIN_BASE_URL}/tables`, buildScopedConfig(scope));
export const createDineInTableApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/tables`, data, buildScopedConfig(scope));
export const updateDineInTableApi = (scope, tableId, data) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}`, data, buildScopedConfig(scope));
export const moveDineInTableApi = (scope, tableId, data) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/move`, data, buildScopedConfig(scope));
export const updateDineInTableStatusApi = (scope, tableId, data) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/status`, data, buildScopedConfig(scope));
export const releaseDineInTableApi = (scope, tableId) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/release`, {}, buildScopedConfig(scope));
export const assignDineInWaiterApi = (scope, tableId, data) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/assign-waiter`, data, buildScopedConfig(scope));
export const transferDineInWaiterApi = (scope, tableId, data) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/transfer-waiter`, data, buildScopedConfig(scope));
export const lockDineInTableApi = (scope, tableId, data) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/lock`, data, buildScopedConfig(scope));
export const unlockDineInTableApi = (scope, tableId) =>
  api.patch(`${DINEIN_BASE_URL}/tables/${tableId}/unlock`, {}, buildScopedConfig(scope));

export const listDineInSessionsApi = (scope) =>
  api.get(`${DINEIN_BASE_URL}/sessions`, buildScopedConfig(scope));
export const openDineInSessionApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/sessions`, data, buildScopedConfig(scope));
export const getDineInSessionApi = (scope, sessionId) =>
  api.get(`${DINEIN_BASE_URL}/sessions/${sessionId}`, buildScopedConfig(scope));
export const joinDineInSessionApi = (scope, sessionId, data) =>
  api.post(`${DINEIN_BASE_URL}/sessions/${sessionId}/join`, data, buildScopedConfig(scope));
export const closeDineInSessionApi = (scope, sessionId, data = {}) =>
  api.patch(`${DINEIN_BASE_URL}/sessions/${sessionId}/close`, data, buildScopedConfig(scope));

export const listDineInReservationsApi = (scope) =>
  api.get(`${DINEIN_BASE_URL}/reservations`, buildScopedConfig(scope));
export const createDineInReservationApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/reservations`, data, buildScopedConfig(scope));
export const confirmDineInReservationApi = (scope, reservationId, data) =>
  api.patch(`${DINEIN_BASE_URL}/reservations/${reservationId}/confirm`, data, buildScopedConfig(scope));
export const cancelDineInReservationApi = (scope, reservationId, data) =>
  api.patch(`${DINEIN_BASE_URL}/reservations/${reservationId}/cancel`, data, buildScopedConfig(scope));

export const listDineInOrdersApi = (scope) =>
  api.get(`${DINEIN_BASE_URL}/orders`, buildScopedConfig(scope));
export const createDineInOrderApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/orders`, data, buildScopedConfig(scope));
export const updateDineInOrderStatusApi = (scope, orderId, data) =>
  api.patch(`${DINEIN_BASE_URL}/orders/${orderId}/status`, data, buildScopedConfig(scope));

export const listDineInAssistanceApi = (scope) =>
  api.get(`${DINEIN_BASE_URL}/assistance`, buildScopedConfig(scope));
export const createDineInAssistanceApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/assistance`, data, buildScopedConfig(scope));
export const resolveDineInAssistanceApi = (scope, requestId, data = {}) =>
  api.patch(`${DINEIN_BASE_URL}/assistance/${requestId}/resolve`, data, buildScopedConfig(scope));

export const generateDineInBillApi = (scope, data) =>
  api.post(`${DINEIN_BASE_URL}/billing/generate`, data, buildScopedConfig(scope));
export const getDineInBillBySessionApi = (scope, sessionId) =>
  api.get(`${DINEIN_BASE_URL}/billing/session/${sessionId}`, buildScopedConfig(scope));
export const recordDineInPaymentApi = (scope, billId, data) =>
  api.patch(`${DINEIN_BASE_URL}/billing/${billId}/payment`, data, buildScopedConfig(scope));
