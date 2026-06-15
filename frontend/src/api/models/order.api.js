import axiosInstance from "../axios.js";

export const OrderApi = {
  listOrders: (params = {}) => {
    return axiosInstance.get("/orders", { params });
  },

  placeOrder: (orderData) => {
    return axiosInstance.post("/orders", orderData);
  },

  getOrderById: (id) => {
    return axiosInstance.get(`/orders/${id}`);
  },

  updateOrderStatus: (id, status) => {
    return axiosInstance.patch(`/orders/${id}/status`, { status });
  },

  cancelOrder: (id, reason) => {
    return axiosInstance.patch(`/orders/${id}/cancel`, { reason });
  },

  listOrderItems: (id) => {
    return axiosInstance.get(`/orders/${id}/items`);
  },

  addItemToOrder: (id, itemData) => {
    return axiosInstance.post(`/orders/${id}/items`, itemData);
  },

  deleteOrder: (id) => {
    return axiosInstance.delete(`/orders/${id}`);
  },
};

export default OrderApi;
