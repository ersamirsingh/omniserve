import axiosInstance from "../axios.js";

export const CustomerApi = {
  listCustomers: (params = {}) => {
    return axiosInstance.get("/customers", { params });
  },

  upsertCustomer: (data) => {
    return axiosInstance.post("/customers", data);
  },

  getCustomerById: (id) => {
    return axiosInstance.get(`/customers/${id}`);
  },

  updateCustomer: (id, data) => {
    return axiosInstance.put(`/customers/${id}`, data);
  },

  deleteCustomer: (id) => {
    return axiosInstance.delete(`/customers/${id}`);
  },

  addAddress: (id, addressData) => {
    return axiosInstance.post(`/customers/${id}/addresses`, addressData);
  },

  updateAddress: (id, addrId, addressData) => {
    return axiosInstance.patch(`/customers/${id}/addresses/${addrId}`, addressData);
  },

  deleteAddress: (id, addrId) => {
    return axiosInstance.delete(`/customers/${id}/addresses/${addrId}`);
  },
};

export default CustomerApi;
