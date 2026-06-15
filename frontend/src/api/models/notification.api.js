import axiosInstance from "../axios.js";

export const NotificationApi = {
  listNotifications: () => {
    return axiosInstance.get("/notifications");
  },

  markAllAsRead: () => {
    return axiosInstance.patch("/notifications/read-all");
  },

  markAsRead: (id) => {
    return axiosInstance.patch(`/notifications/${id}/read`);
  },

  deleteNotification: (id) => {
    return axiosInstance.delete(`/notifications/${id}`);
  },
};

export default NotificationApi;
