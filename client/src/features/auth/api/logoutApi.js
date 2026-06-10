import axiosInstance from "@/services/axios";

export const loginApi = async (payload) => {
  const response = await axiosInstance.post(
    "/auth/logout",
    payload
  );

  return response.data;
};