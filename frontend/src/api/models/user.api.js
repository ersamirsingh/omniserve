import axiosInstance from "../axios.js";

export const UserApi = {
  listUsers: (params = {}) => {
    return axiosInstance.get("/users", { params });
  },

  createUser: (data) => {
    return axiosInstance.post("/users", data);
  },

  getUserById: (id) => {
    return axiosInstance.get(`/users/${id}`);
  },

  updateUser: (id, data) => {
    return axiosInstance.put(`/users/${id}`, data);
  },

  deleteUser: (id) => {
    return axiosInstance.delete(`/users/${id}`);
  },
};

export default UserApi;
