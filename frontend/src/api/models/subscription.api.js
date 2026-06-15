import axiosInstance from "../axios.js";

export const SubscriptionApi = {
  getCurrentSubscription: async () => {
    try {
      const response = await axiosInstance.get("/subscriptions/current");
      return response;
    } catch (err) {
      if (err.response?.status === 404) {
        // Return successful envelope with null data to signify valid empty subscription state
        return { success: true, data: null };
      }
      throw err;
    }
  },

  listSubscriptions: (limit = 10, skip = 0) => {
    return axiosInstance.get("/subscriptions", { params: { limit, skip } });
  },

  getSubscriptionById: (id) => {
    return axiosInstance.get(`/subscriptions/${id}`);
  },

  createSubscription: (subscriptionData) => {
    return axiosInstance.post("/subscriptions", subscriptionData);
  },

  cancelSubscription: (id) => {
    return axiosInstance.patch(`/subscriptions/${id}/cancel`);
  },
};

export default SubscriptionApi;
