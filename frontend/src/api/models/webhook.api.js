import axiosInstance from "../axios.js";

export const WebhookApi = {
  listLogs: (params = {}) => {
    return axiosInstance.get("/webhooks/logs", { params });
  },

  getLogById: (id) => {
    return axiosInstance.get(`/webhooks/logs/${id}`);
  },

  retryLog: (id) => {
    return axiosInstance.post(`/webhooks/logs/${id}/retry`);
  },

  receiveWebhook: (provider, payload) => {
    return axiosInstance.post(`/webhooks/${provider}`, payload);
  },
};

export default WebhookApi;
