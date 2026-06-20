import api from '../axios';

export const listCategoriesApi = (params) => api.get('/categories', { params });
export const createCategoryApi = (data) => api.post('/categories', data);
export const getCategoryByIdApi = (id) => api.get(`/categories/${id}`);
export const updateCategoryApi = (id, data) => api.put(`/categories/${id}`, data);
export const updateCategoryOrderApi = (id, data) => api.patch(`/categories/${id}/order`, data);
export const deleteCategoryApi = (id) => api.delete(`/categories/${id}`);
