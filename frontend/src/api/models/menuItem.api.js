import axiosInstance from "../axios.js";

export const MenuItemApi = {
  listMenuItems: (params = {}) => {
    return axiosInstance.get("/menu-items", { params });
  },

  createMenuItem: (data) => {
    return axiosInstance.post("/menu-items", data);
  },

  toggleAvailability: (id) => {
    return axiosInstance.patch(`/menu-items/${id}/availability`);
  },

  getMenuItemById: (id) => {
    return axiosInstance.get(`/menu-items/${id}`);
  },

  updateMenuItem: (id, data) => {
    return axiosInstance.put(`/menu-items/${id}`, data);
  },

  deleteMenuItem: (id) => {
    return axiosInstance.delete(`/menu-items/${id}`);
  },
};

export default MenuItemApi;
