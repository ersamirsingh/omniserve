import axiosInstance from "../axios.js";

export const InventoryApi = {
  listInventory: (params = {}) => {
    return axiosInstance.get("/inventory", { params });
  },

  listLowStock: () => {
    return axiosInstance.get("/inventory/low-stock");
  },

  createInventory: (data) => {
    return axiosInstance.post("/inventory", data);
  },

  getInventoryById: (id) => {
    return axiosInstance.get(`/inventory/${id}`);
  },

  updateQuantity: (id, quantity, type, reason) => {
    return axiosInstance.patch(`/inventory/${id}/quantity`, { quantity, type, reason });
  },
};

export default InventoryApi;
