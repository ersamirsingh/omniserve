import axiosInstance from "../axios.js";

export const AuthApi = {
  login: (email, password) => {
    return axiosInstance.post("/auth/login", { email, password });
  },

  register: (email, password, firstName, lastName, tenantName) => {
    return axiosInstance.post("/auth/register", {
      email,
      password,
      firstName,
      lastName,
      tenantName,
    });
  },

  logout: (refreshToken) => {
    return axiosInstance.post("/auth/logout", { refreshToken });
  },

  refresh: (refreshToken) => {
    return axiosInstance.post("/auth/refresh", { refreshToken });
  },

  getCurrentUser: () => {
    return axiosInstance.get("/auth/me");
  },

  changePassword: (oldPassword, newPassword, confirmPassword) => {
    return axiosInstance.post("/auth/change-password", {
      oldPassword,
      newPassword,
      confirmPassword,
    });
  },
};

export default AuthApi;
