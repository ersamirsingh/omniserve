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
} from 'react-icons/hi2';
import { USER_ROLES } from '../../utils/constants';

function createLazyPage(importer) {
  const Component = lazy(importer);
  Component.preload = importer;
  return Component;
}

const {
  SUPER_ADMIN,
  RESTAURANT_OWNER,
  OUTLET_MANAGER,
  STAFF,
} = USER_ROLES;

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
};

export const authRoutes = [
  { path: '/login', component: routeComponents.LoginPage },
  { path: '/register', component: routeComponents.RegisterPage },
];

export const dashboardRoutes = [
  { path: '/dashboard', title: 'Dashboard', component: routeComponents.DashboardPage, roles: 'all', nav: { section: 'Main', label: 'Dashboard', icon: HiOutlineHome } },
  { path: '/orders', title: 'Orders', component: routeComponents.OrdersPage, roles: 'all', nav: { section: 'Operations', label: 'Orders', icon: HiOutlineShoppingCart } },
  { path: '/notifications', title: 'Notifications', component: routeComponents.NotificationsPage, roles: 'all', nav: { section: 'Insights', label: 'Notifications', icon: HiOutlineBell } },
  { path: '/profile', title: 'Profile', component: routeComponents.ProfilePage, roles: 'all' },
  { path: '/restaurants', title: 'Restaurants', component: routeComponents.RestaurantsPage, roles: [SUPER_ADMIN], nav: { section: 'Management', label: 'Restaurants', icon: HiOutlineBuildingStorefront } },
  { path: '/audit-logs', title: 'Audit Logs', component: routeComponents.AuditLogsPage, roles: [SUPER_ADMIN], nav: { section: 'Insights', label: 'Audit Logs', icon: HiOutlineDocumentText } },
  { path: '/webhook-logs', title: 'Webhook Logs', component: routeComponents.WebhookLogsPage, roles: [SUPER_ADMIN], nav: { section: 'Insights', label: 'Webhook Logs', icon: HiOutlineDocumentText } },
  { path: '/subscriptions', title: 'Subscriptions', component: routeComponents.SubscriptionsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Finance', label: 'Subscriptions', icon: HiOutlineCreditCard } },
  { path: '/users', title: 'Users', component: routeComponents.UsersPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Insights', label: 'Team', icon: HiOutlineCog6Tooth } },
  { path: '/outlets', title: 'Outlets', component: routeComponents.OutletsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Management', label: 'Outlets', icon: HiOutlineMapPin } },
  { path: '/analytics', title: 'Analytics', component: routeComponents.AnalyticsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Insights', label: 'Analytics', icon: HiOutlineChartBarSquare } },
  { path: '/payments', title: 'Payments', component: routeComponents.PaymentsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER], nav: { section: 'Finance', label: 'Payments', icon: HiOutlineCreditCard } },
  { path: '/categories', title: 'Categories', component: routeComponents.CategoriesPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Categories', icon: HiOutlineSquares2X2 } },
  { path: '/menu-items', title: 'Menu Items', component: routeComponents.MenuItemsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Menu Items', icon: HiOutlineRectangleStack } },
  { path: '/variants', title: 'Variants', component: routeComponents.VariantsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Variants', icon: HiOutlineTag } },
  { path: '/addons', title: 'Addons', component: routeComponents.AddonsPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Addons', icon: HiOutlineTag } },
  { path: '/customers', title: 'Customers', component: routeComponents.CustomersPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Operations', label: 'Customers', icon: HiOutlineUsers } },
  { path: '/integrations', title: 'Integrations', component: routeComponents.IntegrationsDashboardPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER], nav: { section: 'Management', label: 'Integrations', icon: HiOutlineClipboardDocumentList } },
  { path: '/integrations/mappings', title: 'Integrations', component: routeComponents.MappingReviewPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER] },
  { path: '/inventory', title: 'Inventory', component: routeComponents.InventoryPage, roles: [SUPER_ADMIN, RESTAURANT_OWNER, OUTLET_MANAGER, STAFF], nav: { section: 'Operations', label: 'Inventory', icon: HiOutlineCube } },
  { path: '/operations/online', title: 'Online Orders', component: routeComponents.OnlineOrdersPage, roles: 'all' },
  { path: '/operations/preparation', title: 'Order Preparation', component: routeComponents.OrderPreparationPage, roles: 'all', nav: { section: 'Operations', label: 'Order Preparation', icon: HiOutlineQueueList } },
  { path: '/operations/dine-in', title: 'Restaurant Operations', component: routeComponents.OperationsCockpitPage, roles: 'all', nav: { section: 'Operations', label: 'Restaurant Operations', icon: HiOutlineSquares2X2 } },
  { path: '/operations', title: 'Restaurant Operations', component: routeComponents.OperationsCockpitPage, roles: 'all' },
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
];

export function getPageTitle(pathname) {
  return dashboardRoutes.find((route) => route.path === pathname)?.title || 'FoodMesh';
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
