import api from '../axios';

export const getAssignableRestaurantRolesApi = () => api.get('/restaurant-join-requests/roles/assignable');

export const listRestaurantJoinRequestsApi = (restaurantId, params = {}) => (
  api.get(`/restaurant-join-requests/restaurants/${restaurantId}`, { params })
);

export const createRestaurantJoinRequestApi = (restaurantId, data) => (
  api.post(`/restaurant-join-requests/restaurants/${restaurantId}`, data)
);

export const addRestaurantJoinRequestMessageApi = (requestId, message) => (
  api.post(`/restaurant-join-requests/${requestId}/messages`, { message })
);

export const updateRestaurantJoinRequestDecisionApi = (requestId, data) => (
  api.patch(`/restaurant-join-requests/${requestId}/decision`, data)
);

export const acceptRestaurantJoinRequestApi = (token, data) => (
  api.post(`/restaurant-join-requests/accept/${token}`, data)
);
