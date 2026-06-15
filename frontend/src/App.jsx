import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./layouts/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";

// Auth Pages
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

// Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import OrdersManagement from "./pages/orders/OrdersManagement.jsx";
import OutletsManagement from "./pages/outlets/OutletsManagement.jsx";
import MenuManagement from "./pages/menu/MenuManagement.jsx";
import InventoryManagement from "./pages/inventory/InventoryManagement.jsx";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard.jsx";
import SubscriptionBilling from "./pages/subscriptions/SubscriptionBilling.jsx";
import UsersList from "./pages/users/UsersList.jsx";
import AuditLog from "./pages/audit/AuditLog.jsx";
import WebhookLogs from "./pages/audit/WebhookLogs.jsx";
import NotificationsList from "./pages/notifications/NotificationsList.jsx";

export const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Main Dashboard overview landing */}
          <Route index element={<Dashboard />} />
          
          {/* Feature placeholders */}
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="outlets" element={<OutletsManagement />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="subscriptions" element={<SubscriptionBilling />} />
          <Route path="users" element={<UsersList />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="webhooks" element={<WebhookLogs />} />
          <Route path="notifications" element={<NotificationsList />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
