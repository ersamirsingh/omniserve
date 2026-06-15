import axiosInstance from "../axios.js";

export const VariantApi = {
  listVariants: (params = {}) => {
    return axiosInstance.get("/variants", { params });
  },

  createVariant: (data) => {
    return axiosInstance.post("/variants", data);
  },

  updateVariant: (id, data) => {
    return axiosInstance.put(`/variants/${id}`, data);
  },

  deleteVariant: (id) => {
    return axiosInstance.delete(`/variants/${id}`);
  },
};

export default VariantApi;
