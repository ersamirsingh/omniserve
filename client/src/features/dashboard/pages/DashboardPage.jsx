import DashboardHeader from "../components/DashboardHeader";
import StatsCards from "../components/StateCard";



export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />

      <StatsCards />

      {/* <RevenueChart />

      <RecentOrders /> */}
    </div>
  );
}