import api from '../axios';

export const listRestaurantsApi = () => api.get('/restaurants');
export const createRestaurantApi = (data) => api.post('/restaurants', data);
export const getRestaurantByIdApi = (id) => api.get(`/restaurants/${id}`);
export const updateRestaurantApi = (id, data) => api.patch(`/restaurants/${id}`, data);
export const deleteRestaurantApi = (id) => api.delete(`/restaurants/${id}`);
