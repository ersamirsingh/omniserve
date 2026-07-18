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
  HiOutlineChatBubbleLeftRight,
  HiOutlineCalendarDays,
  HiOutlineCircleStack,
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
  LandingPage: createLazyPage(() => import('../../pages/landing/LandingPage')),
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
  SessionStatusPage: createLazyPage(() => import('../../pages/website/SessionStatusPage')),
  OperationsCockpitPage: createLazyPage(() => import('../../pages/operations/OperationsCockpit')),
  OnlineOrdersPage: createLazyPage(() => import('../../pages/orders/OrdersPage').then(module => ({ default: (props) => <module.default mode="ONLINE" viewType="TABLE" {...props} /> }))),
  OnlineOrderFlowPage: createLazyPage(() => import('../../pages/orders/OrdersPage').then(module => ({ default: (props) => <module.default mode="ONLINE" viewType="BOARD" {...props} /> }))),
  OfflineOrdersPage: createLazyPage(() => import('../../pages/orders/OrdersPage').then(module => ({ default: (props) => <module.default mode="DINE_IN" viewType="TABLE" {...props} /> }))),
  OfflineOrderFlowPage: createLazyPage(() => import('../../pages/orders/OrdersPage').then(module => ({ default: (props) => <module.default mode="DINE_IN" viewType="BOARD" {...props} /> }))),
  OrderPreparationPage: createLazyPage(() => import('../../pages/operations/OrderPreparationPage')),
  SystemAdminDashboard: createLazyPage(() => import('../../pages/systemAdmin/SystemAdminDashboard')),
  TenantManagement: createLazyPage(() => import('../../pages/systemAdmin/TenantManagement')),
  GlobalAuditLogs: createLazyPage(() => import('../../pages/systemAdmin/GlobalAuditLogs')),
  HealthDiagnostics: createLazyPage(() => import('../../pages/systemAdmin/HealthDiagnostics')),
  SchemaExplorer: createLazyPage(() => import('../../pages/systemAdmin/SchemaExplorer')),
  IssueTracker: createLazyPage(() => import('../../pages/systemAdmin/IssueTracker')),
  AcceptSystemAdminInvite: createLazyPage(() => import('../../pages/systemAdmin/AcceptSystemAdminInvite')),
  FloorManagementPage: createLazyPage(() => import('../../pages/operations/FloorManagement')),
  MenuManagementPage: createLazyPage(() => import('../../pages/menu/MenuManagement')),
  CopilotPage: createLazyPage(() => import('../../pages/copilot/CopilotPage')),
  ReportsPage: createLazyPage(() => import('../../pages/reports/ReportsPage')),
  ActivityFeedPage: createLazyPage(() => import('../../pages/operations/components/OperationsTimeline')),
  ReservationsPage: createLazyPage(() => import('../../pages/operations/components/ReservationCalendar')),
  NeedHelpPage: createLazyPage(() => import('../../pages/help/NeedHelpPage')),
  ResolveQueriesPage: createLazyPage(() => import('../../pages/help/ResolveQueriesPage')),
  SecurityPage: (props) => {
    const Component = routeComponents.ProfilePage;
    return <Component defaultTab="security" {...props} />;
  },
  SettingsPage: (props) => {
    const Component = routeComponents.ProfilePage;
    return <Component defaultTab="personal" {...props} />;
  },
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
  // --- Main ---
  { path: '/dashboard', title: 'Dashboard', component: routeComponents.DashboardPage, roles: 'all', nav: { section: 'Main', label: 'Dashboard', icon: HiOutlineHome } },
  { path: '/analytics', title: 'Analytics', component: routeComponents.AnalyticsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Main', label: 'Analytics', icon: HiOutlineChartBarSquare } },
  { path: '/copilot', title: 'AI Copilot', component: routeComponents.CopilotPage, roles: 'all', nav: { section: 'Main', label: 'AI Copilot', icon: HiOutlineChatBubbleLeftRight } },
  { path: '/notifications', title: 'Notifications', component: routeComponents.NotificationsPage, roles: RESTAURANT_ROLES, nav: { section: 'Main', label: 'Notifications', icon: HiOutlineBell } },
  { path: '/activity-feed', title: 'Activity Feed', component: routeComponents.ActivityFeedPage, roles: RESTAURANT_ROLES, nav: { section: 'Main', label: 'Activity Feed', icon: HiOutlineQueueList } },
  { path: '/reports', title: 'Reports', component: routeComponents.ReportsPage, roles: [SYSTEM_ADMIN, SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Main', label: 'Reports', icon: HiOutlineDocumentText } },

  // --- Online ---
  { path: '/operations/online-orders', title: 'Online Orders', component: routeComponents.OnlineOrdersPage, roles: RESTAURANT_ROLES, nav: { section: 'Online', label: 'Online Orders', icon: HiOutlineQueueList } },
  { path: '/operations/online-flow', title: 'Online Order Flow', component: routeComponents.OnlineOrderFlowPage, roles: RESTAURANT_ROLES, nav: { section: 'Online', label: 'Online Order Flow', icon: HiOutlineShoppingCart } },
  { path: '/integrations', title: 'Integrations', component: routeComponents.IntegrationsDashboardPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Online', label: 'Integrations', icon: HiOutlineClipboardDocumentList } },
  { path: '/webhook-logs', title: 'Webhook Logs', component: routeComponents.WebhookLogsPage, roles: [SUPER_ADMIN], nav: { section: 'Online', label: 'Webhook Logs', icon: HiOutlineDocumentText } },
  { path: '/audit-logs', title: 'Audit Logs', component: routeComponents.AuditLogsPage, roles: [SUPER_ADMIN], nav: { section: 'Online', label: 'Audit Logs', icon: HiOutlineDocumentText } },

  // --- Offline ---
  { path: '/operations/offline-orders', title: 'Offline Orders', component: routeComponents.OfflineOrdersPage, roles: RESTAURANT_ROLES, nav: { section: 'Offline', label: 'Offline Orders', icon: HiOutlineShoppingCart } },
  { path: '/operations/offline-cockpit', title: 'Offline Cockpit', component: routeComponents.OperationsCockpitPage, roles: RESTAURANT_ROLES, nav: { section: 'Offline', label: 'Offline Cockpit', icon: HiOutlineSquares2X2 } },
  { path: '/operations/offline-order-flow', title: 'Offline Order Flow', component: routeComponents.OrderPreparationPage, roles: RESTAURANT_ROLES, nav: { section: 'Offline', label: 'Offline Order Flow', icon: HiOutlineQueueList } },
  { path: '/operations/reservations', title: 'Reservations', component: routeComponents.ReservationsPage, roles: RESTAURANT_ROLES, nav: { section: 'Offline', label: 'Reservations', icon: HiOutlineCalendarDays } },
  { path: '/floor-management', title: 'Floor Management', component: routeComponents.FloorManagementPage, roles: RESTAURANT_ROLES, nav: { section: 'Offline', label: 'Floor Management', icon: HiOutlineSquares2X2 } },

  // --- Management ---
  { path: '/inventory', title: 'Inventory', component: routeComponents.InventoryPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Inventory', icon: HiOutlineCube } },
  { path: '/customers', title: 'Customers', component: routeComponents.CustomersPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Customers', icon: HiOutlineUsers } },
  { path: '/restaurants', title: 'Restaurants', component: routeComponents.RestaurantsPage, roles: [SUPER_ADMIN], nav: { section: 'Management', label: 'Restaurants', icon: HiOutlineBuildingStorefront } },
  { path: '/outlets', title: 'Outlets', component: routeComponents.OutletsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Outlets', icon: HiOutlineMapPin } },
  { path: '/menu-management', title: 'Menu Management', component: routeComponents.MenuManagementPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Menu Management', icon: HiOutlineSquares2X2 } },

  // --- Finance ---
  { path: '/subscriptions', title: 'Subscriptions', component: routeComponents.SubscriptionsPage, roles: [SYSTEM_ADMIN, SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Finance', label: 'Subscriptions', icon: HiOutlineCreditCard } },
  { path: '/finance/billing', title: 'Billing', component: routeComponents.PaymentsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Finance', label: 'Billing', icon: HiOutlineCreditCard } },

  // --- User ---
  { path: '/users', title: 'Users', component: routeComponents.UsersPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'User', label: 'Team', icon: HiOutlineUsers } },
  { path: '/user/need-help', title: 'Need Help', component: routeComponents.NeedHelpPage, roles: RESTAURANT_ROLES, nav: { section: 'User', label: 'Need Help', icon: HiOutlineChatBubbleLeftRight } },
  { path: '/user/settings', title: 'Settings', component: routeComponents.SettingsPage, roles: 'all', nav: { section: 'User', label: 'Settings', icon: HiOutlineCog6Tooth } },

  // Standalone paths (no sidebar)
  { path: '/profile', title: 'Profile', component: routeComponents.ProfilePage, roles: 'all' },
  { path: '/payments', title: 'Payments', component: routeComponents.PaymentsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER] },
  { path: '/coupons', title: 'Subscription Coupons', component: routeComponents.CouponsPage, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Subscription Coupons', icon: HiOutlineTag } },
  { path: '/categories', title: 'Categories', component: routeComponents.CategoriesPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/menu-items', title: 'Menu Items', component: routeComponents.MenuItemsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/variants', title: 'Variants', component: routeComponents.VariantsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/addons', title: 'Addons', component: routeComponents.AddonsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/integrations/mappings', title: 'Integrations', component: routeComponents.MappingReviewPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/operations/dine-in', title: 'Restaurant Operations', component: routeComponents.OperationsCockpitPage, roles: RESTAURANT_ROLES },
  { path: '/operations/preparation', title: 'Order Preparation', component: routeComponents.OrderPreparationPage, roles: RESTAURANT_ROLES },
  { path: '/operations', title: 'Restaurant Operations', component: routeComponents.OperationsCockpitPage, roles: RESTAURANT_ROLES },
  { path: '/system-admin/tenants', title: 'Tenant Operations', component: routeComponents.TenantManagement, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Tenants', icon: HiOutlineBuildingStorefront } },
  { path: '/system-admin/audit-logs', title: 'Global Audit Logs', component: routeComponents.GlobalAuditLogs, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Audit Logs', icon: HiOutlineDocumentText } },
  { path: '/system-admin/diagnostics', title: 'Health & Diagnostics', component: routeComponents.HealthDiagnostics, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Diagnostics', icon: HiOutlineShieldCheck } },
  { path: '/system-admin/schema', title: 'Schema Explorer', component: routeComponents.SchemaExplorer, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Schema Graph', icon: HiOutlineCircleStack } },
  { path: '/system-admin/issues', title: 'Issue Tracker', component: routeComponents.IssueTracker, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Issue Tracker', icon: HiOutlineChatBubbleLeftRight } },
  { path: '/system-admin/queries', title: 'Resolve Support Queries', component: routeComponents.ResolveQueriesPage, roles: [SYSTEM_ADMIN], nav: { section: 'System Admin', label: 'Resolve Queries', icon: HiOutlineChatBubbleLeftRight } },
];

export const publicWebsiteRoutes = [
  { path: '/', component: routeComponents.LandingPage },
  { path: '/public/w/:outletSlug', component: routeComponents.MenuPage },
  { path: '/public/w/:outletSlug/menu', component: routeComponents.MenuPage },
  { path: '/public/w/:outletSlug/cart', component: routeComponents.CartPage },
  { path: '/public/w/:outletSlug/checkout', component: routeComponents.CheckoutPage },
  { path: '/public/w/:outletSlug/order-success', component: routeComponents.OrderSuccessPage },
  { path: '/public/w/:outletSlug/track/:orderId', component: routeComponents.OrderTrackingPage },
  { path: '/public/w/:outletSlug/table-session', component: routeComponents.TableSessionPage },
  { path: '/public/w/:outletSlug/session-status', component: routeComponents.SessionStatusPage },
  { path: '/public/qr/:tableToken', component: routeComponents.QRRedirectPage },
  { path: '/qr/:tableToken', component: routeComponents.QRRedirectPage },
  { path: '/system-admin/accept-invite', component: routeComponents.AcceptSystemAdminInvite },
];

export function getPageTitle(pathname, userRole) {
  if (userRole === 'STAFF' && pathname === '/dashboard') {
    return 'Offline Order Flow';
  }
  return dashboardRoutes.find((route) => route.path === pathname)?.title || 'OmniServe';
}

export function getSidebarSections(userRole) {
  const sections = new Map();

  dashboardRoutes
    .filter((route) => route.nav)
    .filter((route) => route.roles === 'all' || route.roles.includes(userRole))
    .filter((route) => !(userRole === 'STAFF' && route.path === '/operations/offline-order-flow'))
    .forEach((route) => {
      let sectionName = route.nav.section;
      let label = route.nav.label;
      let icon = route.nav.icon;

      if (userRole === 'STAFF' && route.path === '/dashboard') {
        label = 'Offline Order Flow';
        icon = HiOutlineRectangleStack;
        sectionName = 'Offline';
      }

      if (!sections.has(sectionName)) {
        sections.set(sectionName, []);
      }

      sections.get(sectionName).push({
        to: route.path,
        label,
        icon,
        preload: route.component.preload,
      });
    });

  if (sections.has('Offline')) {
    const items = sections.get('Offline');
    const offlineOrdersItem = items.find(item => item.to === '/operations/offline-orders');
    const offlineFlowItem = items.find(item => item.to === '/dashboard' || item.to === '/operations/offline-order-flow');
    if (offlineOrdersItem && offlineFlowItem) {
      const otherItems = items.filter(item => item.to !== '/operations/offline-orders' && item.to !== '/dashboard' && item.to !== '/operations/offline-order-flow');
      sections.set('Offline', [offlineOrdersItem, offlineFlowItem, ...otherItems]);
    }
  }

  return Array.from(sections.entries()).map(([section, items]) => ({ section, items }));
}
