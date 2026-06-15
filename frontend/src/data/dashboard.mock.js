// Mock data for the FoodMesh dashboard

export const kpiMetrics = {
  todaysRevenue: {
    value: 142850,
    trend: "+12.5%",
    isPositive: true,
    subtitle: "vs yesterday"
  },
  activeOrders: {
    value: 28,
    trend: "+8.2%",
    isPositive: true,
    subtitle: "live queues"
  },
  ordersInKitchen: {
    value: 12,
    trend: "Stable",
    isNeutral: true,
    subtitle: "being prepared"
  },
  ordersReady: {
    value: 8,
    trend: "+15%",
    isPositive: true,
    subtitle: "ready to dispatch"
  },
  totalOutlets: {
    value: 24,
    trend: "Active",
    isPositive: true,
    subtitle: "system wide"
  },
  currentSubscription: {
    value: "PRO PLAN",
    trend: "ACTIVE",
    isPositive: true,
    subtitle: "renews in 12 days"
  },
  customerSatisfaction: {
    value: 4.8,
    trend: "Stable",
    isNeutral: true,
    subtitle: "out of 5.0"
  },
  lowInventoryAlerts: {
    value: 3,
    trend: "Requires Attention",
    isNegative: true,
    subtitle: "items below limit"
  }
};

export const criticalAlerts = [
  {
    id: 1,
    type: "inventory",
    title: "Inventory: Low Stock Alert",
    time: "2 mins ago",
    message: "Chicken Breast (Frozen) is below threshold at Downtown Hub. Estimated depletion in 4 hours.",
    actionText: "Reorder Now",
    severity: "error" // error, warning, info
  },
  {
    id: 2,
    type: "sla",
    title: "SLA Violation Imminent",
    time: "15 mins ago",
    message: "Order #FM-8921 has been pending preparation for 22 minutes at Westside Kitchen.",
    actionText: "Contact Manager",
    severity: "warning"
  },
  {
    id: 3,
    type: "reviews",
    title: "Negative Sentiment Spike",
    time: "1 hour ago",
    message: "3 consecutive 1-star reviews received regarding \"delivery speed\" in the North District.",
    actionText: "View Heatmap",
    severity: "info"
  }
];

export const revenueVsTarget = {
  current: 1250000, // ₹12.5L
  target: 1500000,  // ₹15L
  percentage: 83,
  trendMessage: "+14% vs. last month",
  aiInsight: "You are currently on track to exceed quarterly targets by 4.2% if current momentum holds at Downtown Hub."
};

export const topOutlets = [
  {
    rank: 1,
    name: "Downtown Hub",
    rating: 4.9,
    revenue: 124000
  },
  {
    rank: 2,
    name: "East Gate Kitchen",
    rating: 4.7,
    revenue: 98000
  },
  {
    rank: 3,
    name: "Westside Bistro",
    rating: 4.6,
    revenue: 92000
  }
];

export const networkHealth = {
  uptime: 92,
  online: 22,
  offline: 1,
  issues: 1
};

export const activityFeed = [
  {
    id: 1,
    type: "order",
    title: "New Bulk Order",
    details: "received at Downtown Hub",
    meta: "28 items • ₹4,520.00",
    time: "JUST NOW"
  },
  {
    id: 2,
    type: "inventory",
    title: "Inventory Restocked",
    details: "at Westside Kitchen",
    meta: "Supplier: FreshLine Ltd.",
    time: "12 MINS AGO"
  },
  {
    id: 3,
    type: "staff",
    title: "New Staff Registered",
    details: "Chef Mark A. joined Central Kitchen.",
    meta: "Role: Outlet Chef",
    time: "45 MINS AGO"
  },
  {
    id: 4,
    type: "sync",
    title: "Menu Sync Complete",
    details: "All 24 outlets updated successfully.",
    meta: "Aggregators: Swiggy, Zomato",
    time: "1 HOUR AGO"
  }
];

export const aiForecast = {
  title: "AI Operations Forecast",
  message: "Predicted 25% surge in orders for the upcoming weekend due to local festival. We recommend increasing Prep Staff by 2 at Downtown Hub.",
  actionText: "Optimize Schedules"
};
