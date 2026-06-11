import axiosInstance from "@/services/axios";

export const registerApi = async (payload) => {
  const response = await axiosInstance.post(
    "/auth/register",
    payload
  );

  return response.data;
};