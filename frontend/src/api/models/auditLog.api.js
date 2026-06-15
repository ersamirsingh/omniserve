import axiosInstance from "../axios.js";

export const AuditLogApi = {
  listAuditLogs: (params = {}) => {
    return axiosInstance.get("/audit-logs", { params });
  },

  getAuditLogById: (id) => {
    return axiosInstance.get(`/audit-logs/${id}`);
  },
};

export default AuditLogApi;
