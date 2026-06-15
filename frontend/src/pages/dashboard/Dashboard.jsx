import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { SubscriptionApi } from "../../api/models/subscription.api.js";
import { OutletApi } from "../../api/models/outlet.api.js";

// Custom Dashboard Components
import StatCard from "../../components/dashboard/StatCard.jsx";
import AlertsList from "../../components/dashboard/AlertsList.jsx";
import RevenueTarget from "../../components/dashboard/RevenueTarget.jsx";
import TopOutlets from "../../components/dashboard/TopOutlets.jsx";
import NetworkHealth from "../../components/dashboard/NetworkHealth.jsx";
import ActivityFeed from "../../components/dashboard/ActivityFeed.jsx";
import AIForecast from "../../components/dashboard/AIForecast.jsx";

// Mock Data
import {
  kpiMetrics,
  criticalAlerts,
  revenueVsTarget,
  topOutlets,
  networkHealth,
  activityFeed,
  aiForecast,
} from "../../data/dashboard.mock.js";

// Currency Formatter
import { formatINR } from "../../utils/currency.js";

export const Dashboard = () => {
  const { user } = useAuth();
  const isDev = import.meta.env.DEV;

  // Initialize metrics dynamically, checking DEV environment status
  const [todaysRevenue, setTodaysRevenue] = useState(isDev ? kpiMetrics.todaysRevenue.value : 0);
  const [activeOrders, setActiveOrders] = useState(isDev ? kpiMetrics.activeOrders.value : 0);
  const [ordersInKitchen, setOrdersInKitchen] = useState(isDev ? kpiMetrics.ordersInKitchen.value : 0);
  const [ordersReady, setOrdersReady] = useState(isDev ? kpiMetrics.ordersReady.value : 0);
  const [totalOutletsCount, setTotalOutletsCount] = useState(isDev ? kpiMetrics.totalOutlets.value : 0);
  const [subscriptionPlan, setSubscriptionPlan] = useState(isDev ? kpiMetrics.currentSubscription.value : "No Active Plan");
  const [subscriptionStatus, setSubscriptionStatus] = useState(isDev ? kpiMetrics.currentSubscription.trend : "INACTIVE");
  const [satisfaction, setSatisfaction] = useState(isDev ? kpiMetrics.customerSatisfaction.value : 0);
  const [inventoryAlerts, setInventoryAlerts] = useState(isDev ? kpiMetrics.lowInventoryAlerts.value : 0);

  // Fetch real backend values where available, keeping mock fallbacks for dev only
  useEffect(() => {
    const fetchDashboardDetails = async () => {
      try {
        const [subRes, outletsRes] = await Promise.allSettled([
          SubscriptionApi.getCurrentSubscription(),
          OutletApi.listOutlets(),
        ]);

        if (subRes.status === "fulfilled" && subRes.value.success) {
          const sub = subRes.value.data;
          if (sub) {
            setSubscriptionPlan(`${sub.plan} PLAN`);
            setSubscriptionStatus(sub.status || "ACTIVE");
          } else {
            // Null subscription case (business valid empty state)
            setSubscriptionPlan("No Active Plan");
            setSubscriptionStatus("INACTIVE");
          }
        }

        if (outletsRes.status === "fulfilled" && outletsRes.value.success && outletsRes.value.data) {
          const list = Array.isArray(outletsRes.value.data)
            ? outletsRes.value.data
            : outletsRes.value.data.outlets || [];
          setTotalOutletsCount(list.length);
        }
      } catch (err) {
        console.warn("Backend dynamic dashboard fetching error:", err);
      }
    };

    if (user) {
      fetchDashboardDetails();
    }
  }, [user]);

  return (
    <div className="space-y-gutter animate-fade-in pb-8">
      {/* Page Header with Rebranded Welcome & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface dark:text-zinc-100 text-[24px] font-bold tracking-tight">
            Operations Overview
          </h2>
          <p className="text-body-md text-on-surface-variant dark:text-zinc-400 mt-1 text-[14px]">
            Real-time performance across your FoodMesh kitchen network. "One Platform. Every Order."
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-border-base dark:border-zinc-800 rounded-lg text-primary dark:text-primary-fixed-dim font-bold text-[13px] hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">sync</span>
            Sync Menu
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border-base dark:border-zinc-800 rounded-lg text-primary dark:text-primary-fixed-dim font-bold text-[13px] hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            Add Outlet
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-primary dark:bg-primary-container text-white dark:text-on-primary-container rounded-lg font-bold text-[13px] hover:bg-primary/95 transition-all shadow-sm active:scale-[0.98]">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Order
          </button>
        </div>
      </div>

      {/* 8-Card Bento Operational Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Revenue"
          value={formatINR(todaysRevenue)}
          trend={isDev ? kpiMetrics.todaysRevenue.trend : undefined}
          trendType={isDev && kpiMetrics.todaysRevenue.isPositive ? "up" : "down"}
          type="revenue"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders.toString()}
          trend={isDev ? kpiMetrics.activeOrders.trend : undefined}
          trendType={isDev && kpiMetrics.activeOrders.isPositive ? "up" : "down"}
          type="orders"
        />
        <StatCard
          title="Orders in Kitchen"
          value={ordersInKitchen.toString()}
          trend={isDev ? kpiMetrics.ordersInKitchen.trend : undefined}
          trendType="neutral"
          type="satisfaction" // uses status-bar style indicator
        />
        <StatCard
          title="Orders Ready"
          value={ordersReady.toString()}
          trend={isDev ? kpiMetrics.ordersReady.trend : undefined}
          trendType={isDev && kpiMetrics.ordersReady.isPositive ? "up" : "down"}
          type="orders"
        />
        <StatCard
          title="Total Outlets"
          value={totalOutletsCount.toString()}
          trend={isDev ? "Active" : undefined}
          trendType="up"
          subtitle="FoodMesh kitchen sites"
          type="subscription"
        />
        <StatCard
          title="Current Subscription"
          value={subscriptionPlan}
          trend={subscriptionStatus !== "INACTIVE" ? subscriptionStatus : undefined}
          trendType={subscriptionStatus === "ACTIVE" ? "up" : "down"}
          subtitle="billing status"
          type="subscription"
        />
        <StatCard
          title="Customer Satisfaction"
          value={satisfaction.toString()}
          trend={isDev ? kpiMetrics.customerSatisfaction.trend : undefined}
          trendType="neutral"
          type="satisfaction"
        />
        <StatCard
          title="Low Inventory Alerts"
          value={inventoryAlerts.toString()}
          trend={isDev ? kpiMetrics.lowInventoryAlerts.trend : undefined}
          trendType="down"
          subtitle="requires attention"
          type="inventory"
        />
      </div>

      {/* Main Bento Layout Panel: Section Widgets & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left widget column (Alerts, target, outlets) - Span 8 */}
        <div className="lg:col-span-8 space-y-6">
          <AlertsList alerts={isDev ? criticalAlerts : []} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevenueTarget
              data={
                isDev
                  ? revenueVsTarget
                  : { current: 0, target: 1, percentage: 0, trendMessage: "", aiInsight: "" }
              }
            />
            <TopOutlets outlets={isDev ? topOutlets : []} />
          </div>
        </div>

        {/* Right widget column (Health, feed, AI forecast) - Span 4 */}
        <div className="lg:col-span-4 space-y-6">
          <NetworkHealth
            health={
              isDev
                ? networkHealth
                : { uptime: 100, online: totalOutletsCount, offline: 0, issues: 0 }
            }
          />
          <ActivityFeed feed={isDev ? activityFeed : []} />
          <AIForecast forecast={isDev ? aiForecast : null} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
