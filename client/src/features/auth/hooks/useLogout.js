import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logoutApi } from "../api/logoutApi";
import { logout } from "../authSlice";

export const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutApi,

    onSuccess: () => {
      localStorage.removeItem("accessToken");

      dispatch(logout());

      navigate("/login", {
        replace: true,
      });
    },

    onError: (error) => {
      console.error(
        "Logout Failed:",
        error?.response?.data?.message
      );

      localStorage.removeItem("accessToken");

      dispatch(logout());

      navigate("/login", {
        replace: true,
      });
    },
  });
};