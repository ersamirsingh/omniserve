import axiosInstance from "../axios.js";

export const OutletApi = {
  listOutlets: () => {
    return axiosInstance.get("/outlets");
  },

  createOutlet: (data) => {
    return axiosInstance.post("/outlets", data);
  },

  getOutletById: (id) => {
    return axiosInstance.get(`/outlets/${id}`);
  },

  updateOutlet: (id, data) => {
    return axiosInstance.put(`/outlets/${id}`, data);
  },

  toggleOutletStatus: (id) => {
    return axiosInstance.patch(`/outlets/${id}/status`);
  },

  updateOperatingHours: (id, hours) => {
    return axiosInstance.patch(`/outlets/${id}/operating-hours`, { operatingHours: hours });
  },

  deleteOutlet: (id) => {
    return axiosInstance.delete(`/outlets/${id}`);
  },

  findNearbyOutlets: (lat, lng, radius = 5) => {
    return axiosInstance.get("/outlets/nearby", { params: { lat, lng, radius } });
  },
};

export default OutletApi;
