import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage";
// import StatsCards from "./features/dashboard/components/StateCard";
// import OrdersChart from "./features/dashboard/components/OrderChart";
// import InventoryAlerts from "./features/dashboard/components/InventryAlert";
import DashboardPage from "./features/dashboard/pages/DashboardPage";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}