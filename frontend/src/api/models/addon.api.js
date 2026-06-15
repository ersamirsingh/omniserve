import axiosInstance from "../axios.js";

export const AddonApi = {
  listAddons: (params = {}) => {
    return axiosInstance.get("/addons", { params });
  },

  createAddon: (data) => {
    return axiosInstance.post("/addons", data);
  },

  updateAddon: (id, data) => {
    return axiosInstance.put(`/addons/${id}`, data);
  },

  deleteAddon: (id) => {
    return axiosInstance.delete(`/addons/${id}`);
  },
};

export default AddonApi;
