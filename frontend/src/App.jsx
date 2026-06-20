import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { USER_ROLES } from './utils/constants';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { fetchCurrentUser } from './store/authSlice';
import Spinner from './components/ui/Spinner';

/* Layouts */
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './layouts/ProtectedRoute';
import AuthRoute from './layouts/authRoute';

/* Auth pages */
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JoinRestaurantPage from './pages/auth/JoinRestaurantPage';

/* Dashboard pages */
import DashboardPage from './pages/dashboard/DashboardPage';

/* Management pages */
import RestaurantsPage from './pages/restaurants/RestaurantsPage';
import RestaurantJoinRequestsPage from './pages/restaurants/RestaurantJoinRequestsPage';
import OutletsPage from './pages/outlets/OutletsPage';
import CategoriesPage from './pages/menu/CategoriesPage';
import MenuItemsPage from './pages/menu/MenuItemsPage';
import VariantsPage from './pages/menu/VariantsPage';
import AddonsPage from './pages/menu/AddonsPage';

/* Operations pages */
import OrdersPage from './pages/orders/OrdersPage';
import CustomersPage from './pages/customers/CustomersPage';
import InventoryPage from './pages/inventory/InventoryPage';

/* Finance pages */
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import PaymentsPage from './pages/payments/PaymentsPage';

/* Insights pages */
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import WebhookLogs from './pages/audit/WebhookLogs';
import UsersPage from './pages/users/UsersPage';
import ProfilePage from './pages/profile/ProfilePage';

const { SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER, STAFF } = USER_ROLES;

export default function App() {

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  // const user = useSelector(state=>state.auth.user);
  // console.log(user);
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public auth routes ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
          <Route path="/join-restaurant" element={<JoinRestaurantPage />} />
        </Route>

        {/* ── Protected dashboard routes ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* All roles */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Super Admin only */}
            <Route element={<ProtectedRoute roles={[SUPER_ADMIN]} />}>
              <Route path="/restaurants" element={<RestaurantsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/webhook-logs" element={<WebhookLogs />} />
            </Route>

            {/* Super Admin + Restaurant Owner */}
            <Route element={<ProtectedRoute roles={[SUPER_ADMIN, RESTAURANT_OWNER]} />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/outlets" element={<OutletsPage />} />
            </Route>

            {/* Super Admin only */}
            <Route element={<ProtectedRoute roles={[SUPER_ADMIN]} />}>
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
            </Route>

            {/* Financial / analytics visibility */}
            <Route element={<ProtectedRoute roles={[SUPER_ADMIN, RESTAURANT_OWNER]} />}>
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
            </Route>

            {/* Menu and stock management */}
            <Route element={<ProtectedRoute roles={[SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER]} />}>
              <Route path="/join-requests" element={<RestaurantJoinRequestsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/menu-items" element={<MenuItemsPage />} />
              <Route path="/variants" element={<VariantsPage />} />
              <Route path="/addons" element={<AddonsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
            </Route>

            {/* Inventory quantity updates are allowed for Staff */}
            <Route element={<ProtectedRoute roles={[SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER, STAFF]} />}>
              <Route path="/inventory" element={<InventoryPage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
