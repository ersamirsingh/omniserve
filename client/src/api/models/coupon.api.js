import api from '../axios';

// Admin CRUD operations
export const listCouponsApi = (params) => api.get('/coupons', { params });
export const getCouponByIdApi = (id) => api.get(`/coupons/${id}`);
export const createCouponApi = (data) => api.post('/coupons', data);
export const updateCouponApi = (id, data) => api.put(`/coupons/${id}`, data);
export const deleteCouponApi = (id) => api.delete(`/coupons/${id}`);

// Public coupon validation
export const validateCouponApi = (outletSlug, code, subtotal) => 
  api.get(`/public/o/${outletSlug}/coupons/validate`, {
    params: { code, subtotal }
  });
