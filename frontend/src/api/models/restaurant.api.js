import axiosInstance from "../axios.js";

export const RestaurantApi = {
  getRestaurants: () => {
    return axiosInstance.get("/restaurants");
  },

  createRestaurant: (data) => {
    return axiosInstance.post("/restaurants", data);
  },

  getRestaurantById: (id) => {
    return axiosInstance.get(`/restaurants/${id}`);
  },

  updateRestaurant: (id, data) => {
    return axiosInstance.patch(`/restaurants/${id}`, data);
  },

  deleteRestaurant: (id) => {
    return axiosInstance.delete(`/restaurants/${id}`);
  },
};

export default RestaurantApi;
