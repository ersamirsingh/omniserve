import axiosInstance from "@/services/axios";

export const loginApi = async (payload) => {
  const response = await axiosInstance.post(
    "/auth/login",
    payload
  );

  return response.data;
};