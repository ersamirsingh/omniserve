import { lazy } from 'react';
import {
  HiOutlineHome,
  HiOutlineBuildingStorefront,
  HiOutlineMapPin,
  HiOutlineRectangleStack,
  HiOutlineClipboardDocumentList,
  HiOutlineShoppingCart,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineCreditCard,
  HiOutlineBell,
  HiOutlineChartBarSquare,
  HiOutlineDocumentText,
  HiOutlineCog6Tooth,
  HiOutlineTag,
  HiOutlineSquares2X2,
  HiOutlineQueueList,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import { USER_ROLES } from '../../utils/constants';

function createLazyPage(importer) {
  const Component = lazy(importer);
  Component.preload = importer;
  return Component;
}

const {
  SYSTEM_ADMIN,
  SUPER_ADMIN,
  RESTAURANT_OWNER,
  OUTLET_MANAGER,
  STAFF,
} = USER_ROLES;

const RESTAURANT_ROLES = [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER, STAFF];

export const routeComponents = {
  LoginPage: createLazyPage(() => import('../../pages/auth/LoginPage')),
  RegisterPage: createLazyPage(() => import('../../pages/auth/RegisterPage')),
  DashboardPage: createLazyPage(() => import('../../pages/dashboard/DashboardPage')),
  RestaurantsPage: createLazyPage(() => import('../../pages/restaurants/RestaurantsPage')),
  OutletsPage: createLazyPage(() => import('../../pages/outlets/OutletsPage')),
  CategoriesPage: createLazyPage(() => import('../../pages/menu/CategoriesPage')),
  MenuItemsPage: createLazyPage(() => import('../../pages/menu/MenuItemsPage')),
  VariantsPage: createLazyPage(() => import('../../pages/menu/VariantsPage')),
  AddonsPage: createLazyPage(() => import('../../pages/menu/AddonsPage')),
  OrdersPage: createLazyPage(() => import('../../pages/orders/OrdersPage')),
  CustomersPage: createLazyPage(() => import('../../pages/customers/CustomersPage')),
  InventoryPage: createLazyPage(() => import('../../pages/inventory/InventoryPage')),
  SubscriptionsPage: createLazyPage(() => import('../../pages/subscriptions/SubscriptionsPage')),
  PaymentsPage: createLazyPage(() => import('../../pages/payments/PaymentsPage')),
  AnalyticsPage: createLazyPage(() => import('../../pages/analytics/AnalyticsPage')),
  NotificationsPage: createLazyPage(() => import('../../pages/notifications/NotificationsPage')),
  AuditLogsPage: createLazyPage(() => import('../../pages/audit/AuditLogsPage')),
  WebhookLogsPage: createLazyPage(() => import('../../pages/audit/WebhookLogs')),
  UsersPage: createLazyPage(() => import('../../pages/users/UsersPage')),
  CouponsPage: createLazyPage(() => import('../../pages/coupon/CouponsPage')),
  ProfilePage: createLazyPage(() => import('../../pages/profile/ProfilePage')),
  IntegrationsDashboardPage: createLazyPage(() => import('../../pages/integrations/IntegrationsDashboard')),
  MappingReviewPage: createLazyPage(() => import('../../pages/integrations/MappingReview')),
  MenuPage: createLazyPage(() => import('../../pages/website/MenuPage')),
  CartPage: createLazyPage(() => import('../../pages/website/CartPage')),
  CheckoutPage: createLazyPage(() => import('../../pages/website/CheckoutPage')),
  OrderSuccessPage: createLazyPage(() => import('../../pages/website/OrderSuccessPage')),
  OrderTrackingPage: createLazyPage(() => import('../../pages/website/OrderTrackingPage')),
  QRRedirectPage: createLazyPage(() => import('../../pages/website/QRRedirectPage')),
  TableSessionPage: createLazyPage(() => import('../../pages/website/TableSessionPage')),
  OperationsCockpitPage: createLazyPage(() => import('../../pages/operations/OperationsCockpit')),
  OnlineOrdersPage: createLazyPage(() => import('../../pages/orders/OrdersPage').then(module => ({ default: (props) => <module.default mode="ONLINE" {...props} /> }))),
  OrderPreparationPage: createLazyPage(() => import('../../pages/operations/OrderPreparationPage')),
  SystemAdminDashboard: createLazyPage(() => import('../../pages/systemAdmin/SystemAdminDashboard')),
  TenantManagement: createLazyPage(() => import('../../pages/systemAdmin/TenantManagement')),
  GlobalAuditLogs: createLazyPage(() => import('../../pages/systemAdmin/GlobalAuditLogs')),
  HealthDiagnostics: createLazyPage(() => import('../../pages/systemAdmin/HealthDiagnostics')),
  AcceptSystemAdminInvite: createLazyPage(() => import('../../pages/systemAdmin/AcceptSystemAdminInvite')),
  FloorManagementPage: createLazyPage(() => import('../../pages/operations/FloorManagement')),
  MenuManagementPage: createLazyPage(() => import('../../pages/menu/MenuManagement')),
};

export const NAV_PERMISSIONS = {
  [SUPER_ADMIN]: ['MENU_MANAGEMENT', 'INVENTORY', 'TEAM_MANAGEMENT', 'FLOOR_MANAGEMENT', 'FLOOR_DESIGNER', 'RESTAURANT_OPERATIONS', 'OUTLET_TOGGLE', 'QR_CODES', 'MERGE_TABLE'],
  [RESTAURANT_OWNER]: ['MENU_MANAGEMENT', 'INVENTORY', 'TEAM_MANAGEMENT', 'FLOOR_MANAGEMENT', 'FLOOR_DESIGNER', 'RESTAURANT_OPERATIONS', 'OUTLET_TOGGLE', 'QR_CODES', 'MERGE_TABLE'],
  [OUTLET_MANAGER]: ['MENU_MANAGEMENT', 'INVENTORY', 'TEAM_MANAGEMENT', 'FLOOR_MANAGEMENT', 'FLOOR_DESIGNER', 'RESTAURANT_OPERATIONS', 'OUTLET_TOGGLE', 'QR_CODES', 'MERGE_TABLE'],
  [STAFF]: ['FLOOR_MANAGEMENT', 'RESTAURANT_OPERATIONS'],
  [SYSTEM_ADMIN]: []
};

export function hasPermission(userRole, feature) {
  if (!userRole) return false;
  const allowedFeatures = NAV_PERMISSIONS[userRole] || [];
  return allowedFeatures.includes(feature);
}

export const authRoutes = [
  { path: '/login', component: routeComponents.LoginPage },
  { path: '/register', component: routeComponents.RegisterPage },
];

export const dashboardRoutes = [
  { path: '/dashboard', title: 'Dashboard', component: routeComponents.DashboardPage, roles: 'all', nav: { section: 'Main', label: 'Dashboard', icon: HiOutlineHome } },
  { path: '/orders', title: 'Orders', component: routeComponents.OrdersPage, roles: RESTAURANT_ROLES, nav: { section: 'Operations', label: 'Orders', icon: HiOutlineShoppingCart } },
  { path: '/notifications', title: 'Notifications', component: routeComponents.NotificationsPage, roles: RESTAURANT_ROLES, nav: { section: 'Insights', label: 'Notifications', icon: HiOutlineBell } },
  { path: '/profile', title: 'Profile', component: routeComponents.ProfilePage, roles: 'all' },
  { path: '/restaurants', title: 'Restaurants', component: routeComponents.RestaurantsPage, roles: [SUPER_ADMIN], nav: { section: 'Management', label: 'Restaurants', icon: HiOutlineBuildingStorefront } },
  { path: '/audit-logs', title: 'Audit Logs', component: routeComponents.AuditLogsPage, roles: [SUPER_ADMIN], nav: { section: 'Insights', label: 'Audit Logs', icon: HiOutlineDocumentText } },
  { path: '/webhook-logs', title: 'Webhook Logs', component: routeComponents.WebhookLogsPage, roles: [SUPER_ADMIN], nav: { section: 'Insights', label: 'Webhook Logs', icon: HiOutlineDocumentText } },
  { path: '/subscriptions', title: 'Subscriptions', component: routeComponents.SubscriptionsPage, roles: [SYSTEM_ADMIN, SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Finance', label: 'Subscriptions', icon: HiOutlineCreditCard } },
  { path: '/users', title: 'Users', component: routeComponents.UsersPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Insights', label: 'Team', icon: HiOutlineCog6Tooth } },
  { path: '/outlets', title: 'Outlets', component: routeComponents.OutletsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Outlets', icon: HiOutlineMapPin } },
  { path: '/analytics', title: 'Analytics', component: routeComponents.AnalyticsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Insights', label: 'Analytics', icon: HiOutlineChartBarSquare } },
  { path: '/payments', title: 'Payments', component: routeComponents.PaymentsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Finance', label: 'Payments', icon: HiOutlineCreditCard } },
  
  // Menu Management Unified Workspace
  { path: '/menu-management', title: 'Menu Management', component: routeComponents.MenuManagementPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Menu Management', icon: HiOutlineSquares2X2 } },
  { path: '/coupons', title: 'Promo Coupons', component: routeComponents.CouponsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Management', label: 'Promo Coupons', icon: HiOutlineTag } },
  
  // Standalone paths (no longer in sidebar, but still routable)
  { path: '/categories', title: 'Categories', component: routeComponents.CategoriesPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/menu-items', title: 'Menu Items', component: routeComponents.MenuItemsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/variants', title: 'Variants', component: routeComponents.VariantsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/addons', title: 'Addons', component: routeComponents.AddonsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  
  { path: '/customers', title: 'Customers', component: routeComponents.CustomersPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Operations', label: 'Customers', icon: HiOutlineUsers } },
  { path: '/integrations', title: 'Integrations', component: routeComponents.IntegrationsDashboardPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Integrations', icon: HiOutlineClipboardDocumentList } },
  { path: '/integrations/mappings', title: 'Integrations', component: routeComponents.MappingReviewPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/inventory', title: 'Inventory', component: routeComponents.InventoryPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Operations', label: 'Inventory', icon: HiOutlineCube } },
  { path: '/operations/online', title: 'Online Orders', component: routeComponents.OnlineOrdersPage, roles: RESTAURANT_ROLES },
  { path: '/operations/preparation', title: 'Order Preparation', component: routeComponents.OrderPreparationPage, roles: RESTAURANT_ROLES, nav: { section: 'Operations', label: 'Order Preparation', icon: HiOutlineQueueList } },
  { path: '/operations/dine-in', title: 'Restaurant Operations', component: routeComponents.OperationsCockpitPage, roles: RESTAURANT_ROLES, nav: { section: 'Operations', label: 'Restaurant Operations', icon: HiOutlineSquares2X2 } },
  { path: '/operations', title: 'Restaurant Operations', component: routeComponents.OperationsCockpitPage, roles: RESTAURANT_ROLES },
  
  // Floor Management Workspace
  { path: '/floor-management', title: 'Floor Management', component: routeComponents.FloorManagementPage, roles: RESTAURANT_ROLES, nav: { section: 'Operations', label: 'Floor Management', icon: HiOutlineSquares2X2 } },
  
  // System Admin Routes
  { path: '/system-admin/tenants', title: 'Tenant Operations', component: routeComponents.TenantManagement, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Tenants', icon: HiOutlineBuildingStorefront } },
  { path: '/system-admin/audit-logs', title: 'Global Audit Logs', component: routeComponents.GlobalAuditLogs, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Audit Logs', icon: HiOutlineDocumentText } },
  { path: '/system-admin/diagnostics', title: 'Health & Diagnostics', component: routeComponents.HealthDiagnostics, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Diagnostics', icon: HiOutlineShieldCheck } },
];

export const publicWebsiteRoutes = [
  { path: '/public/w/:outletSlug', component: routeComponents.MenuPage },
  { path: '/public/w/:outletSlug/menu', component: routeComponents.MenuPage },
  { path: '/public/w/:outletSlug/cart', component: routeComponents.CartPage },
  { path: '/public/w/:outletSlug/checkout', component: routeComponents.CheckoutPage },
  { path: '/public/w/:outletSlug/order-success', component: routeComponents.OrderSuccessPage },
  { path: '/public/w/:outletSlug/track/:orderId', component: routeComponents.OrderTrackingPage },
  { path: '/public/w/:outletSlug/table-session', component: routeComponents.TableSessionPage },
  { path: '/public/qr/:tableToken', component: routeComponents.QRRedirectPage },
  { path: '/qr/:tableToken', component: routeComponents.QRRedirectPage },
  { path: '/system-admin/accept-invite', component: routeComponents.AcceptSystemAdminInvite },
];

export function getPageTitle(pathname) {
  return dashboardRoutes.find((route) => route.path === pathname)?.title || 'OmniServe';
}

export function getSidebarSections(userRole) {
  const sections = new Map();

  dashboardRoutes
    .filter((route) => route.nav)
    .filter((route) => route.roles === 'all' || route.roles.includes(userRole))
    .forEach((route) => {
      const sectionName = route.nav.section;
      if (!sections.has(sectionName)) {
        sections.set(sectionName, []);
      }

      sections.get(sectionName).push({
        to: route.path,
        label: route.nav.label,
        icon: route.nav.icon,
        preload: route.component.preload,
      });
    });

  return Array.from(sections.entries()).map(([section, items]) => ({ section, items }));
}
