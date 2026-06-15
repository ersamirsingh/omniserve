import axiosInstance from "../axios.js";

export const AnalyticsApi = {
  upsertDailyMetrics: (data) => {
    return axiosInstance.post("/analytics/daily", data);
  },

  getDailyStats: (params = {}) => {
    return axiosInstance.get("/analytics/daily", { params });
  },

  getSummaryStats: () => {
    return axiosInstance.get("/analytics/summary");
  },

  getSentimentSummary: (params = {}) => {
    return axiosInstance.get("/analytics/reviews/sentiment", { params });
  },

  createReview: (reviewData) => {
    return axiosInstance.post("/analytics/reviews", reviewData);
  },

  getReviews: (params = {}) => {
    return axiosInstance.get("/analytics/reviews", { params });
  },

  deleteReview: (id) => {
    return axiosInstance.delete(`/analytics/reviews/${id}`);
  },
};

export default AnalyticsApi;
