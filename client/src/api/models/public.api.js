import api from "../axios";

export const getPublicMenuApi = (outletSlug, params) => {
  const guestSessionToken = localStorage.getItem("guestSessionToken");
  const headers = guestSessionToken ? { "x-guest-session-token": guestSessionToken } : {};
  return api.get(`/public/o/${outletSlug}/menu`, { params, headers });
};

export const getPublicCategoriesApi = (outletSlug) =>
  api.get(`/public/o/${outletSlug}/categories`);

export const getPublicMenuItemApi = (outletSlug, itemId) =>
  api.get(`/public/o/${outletSlug}/menu/${itemId}`);

export const getCartApi = () => {
  const guestSessionToken = localStorage.getItem("guestSessionToken");
  const headers = guestSessionToken ? { "x-guest-session-token": guestSessionToken } : {};
  return api.get("/public/cart", { headers });
};

export const createOrUpdateCartApi = (data) =>
  api.post("/public/cart", data);

export const updateCartApi = (cartId, data) =>
  api.patch(`/public/cart/${cartId}`, data);

export const removeFromCartApi = (cartId, itemId, params) =>
  api.delete(`/public/cart/${cartId}/items/${itemId}`, { params });

export const createCustomerAddressApi = (data) =>
  api.post("/public/customer/address", data);

export const checkoutCartApi = (data) =>
  api.post("/public/checkout", data);

export const trackOrderApi = (orderId) =>
  api.get(`/public/orders/track/${orderId}`);

export const resolveQrCodeApi = (tableToken, params) => {
  const guestSessionToken = localStorage.getItem("guestSessionToken");
  const headers = guestSessionToken ? { "x-guest-session-token": guestSessionToken } : {};
  return api.get(`/public/qr/resolve/${tableToken}`, { params, headers });
};

export const requestQrAssistanceApi = (data) =>
  api.post("/public/qr/assist", data);

export const placeQrOrderApi = (data) =>
  api.post("/public/qr/orders", data);

export const getQrSessionBillApi = (sessionToken) =>
  api.get(`/public/qr/session/${sessionToken}/bill`);

export const payQrSessionBillApi = (sessionToken, data) =>
  api.post(`/public/qr/session/${sessionToken}/pay`, data);

export const updateGuestSessionApi = (data) => {
  const guestSessionToken = localStorage.getItem("guestSessionToken");
  const headers = guestSessionToken ? { "x-guest-session-token": guestSessionToken } : {};
  return api.patch("/public/qr/guest/session", data, { headers });
};

export const leaveGuestSessionApi = () => {
  const guestSessionToken = localStorage.getItem("guestSessionToken");
  const headers = guestSessionToken ? { "x-guest-session-token": guestSessionToken } : {};
  return api.post("/public/qr/guest/session/leave", {}, { headers });
};

export const listOutletCouponsApi = (outletSlug) =>
  api.get(`/public/o/${outletSlug}/coupons`);

export const validateCouponApi = (outletSlug, code, subtotal) =>
  api.get(`/public/o/${outletSlug}/coupons/validate`, { params: { code, subtotal } });

export const splitQrSessionBillApi = (sessionToken, data) =>
  api.post(`/public/qr/session/${sessionToken}/bill/split`, data);

export const submitQrSessionFeedbackApi = (sessionToken, data) =>
  api.post(`/public/qr/session/${sessionToken}/feedback`, data);

export const getQrSessionGuestsApi = (sessionToken) =>
  api.get(`/public/qr/session/${sessionToken}/guests`);
