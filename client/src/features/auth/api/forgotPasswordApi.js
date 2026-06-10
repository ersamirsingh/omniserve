import axiosInstance from "@/services/axios";

export const loginApi = async (payload) => {
  const response = await axiosInstance.post(
    "/auth/forgotpassword",
    payload
  );

  return response.data;
};