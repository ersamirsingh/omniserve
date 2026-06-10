import { useDispatch, useSelector } from "react-redux";
import { selectDashboardStats } from "../dashboardSelectors";

export const useDashboard = () => {
  const dispatch = useDispatch();

  const stats = useSelector(selectDashboardStats);

  return {
    dispatch,
    stats,
  };
};