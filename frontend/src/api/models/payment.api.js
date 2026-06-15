import axiosInstance from "../axios.js";

export const PaymentApi = {
  listPayments: (params = {}) => {
    return axiosInstance.get("/payments", { params });
  },

  getPaymentByOrderId: (orderId) => {
    return axiosInstance.get(`/payments/order/${orderId}`);
  },

  createPayment: (paymentData) => {
    return axiosInstance.post("/payments", paymentData);
  },

  refundPayment: (id, amount, reason) => {
    return axiosInstance.patch(`/payments/${id}/refund`, { amount, reason });
  },

  getPaymentById: (id) => {
    return axiosInstance.get(`/payments/${id}`);
  },
};

export default PaymentApi;
