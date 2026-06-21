// src/modules/analytics/interfaces/analytics.interface.ts

export interface DateRangeDto {
  startDate: Date;
  endDate: Date;
}

export interface RevenueTrendFilterDto extends DateRangeDto {
  tenantId: string;
  outletId?: string;
}

export interface DashboardFilterDto {
  tenantId: string;
  outletId?: string;
}

export interface TopItemsFilterDto extends DateRangeDto {
  tenantId: string;
  outletId?: string;
  limit?: number;
}

export interface PeakHoursFilterDto extends DateRangeDto {
  tenantId: string;
  outletId?: string;
}

export interface OutletComparisonFilterDto extends DateRangeDto {
  tenantId: string;
}

export interface CustomerRetentionFilterDto extends DateRangeDto {
  tenantId: string;
}

export interface RevenueOverviewResponse {
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;

  revenueGrowthPercentage: number;

  totalOrders: number;

  averageOrderValue: number;

  totalCustomers: number;
}

export interface RevenueTrendItem {
  date: string;

  revenue: number;

  orders: number;

  averageOrderValue: number;
}

export interface RevenueTrendResponse {
  trend: RevenueTrendItem[];
}

export interface TopSellingItem {
  menuItemId: string;

  menuItemName: string;

  quantitySold: number;

  revenue: number;

  profit: number;
}

export interface TopSellingItemsResponse {
  items: TopSellingItem[];
}

export interface PeakHourItem {
  hour: number;

  totalOrders: number;

  totalRevenue: number;
}

export interface PeakHoursResponse {
  peakHours: PeakHourItem[];
}

export interface CustomerRetentionResponse {
  totalCustomers: number;

  newCustomers: number;

  repeatCustomers: number;

  retentionRate: number;

  averageCustomerValue: number;
}

export interface OutletComparisonItem {
  outletId: string;

  outletName: string;

  totalRevenue: number;

  totalOrders: number;

  totalCustomers: number;

  averageOrderValue: number;

  grossProfit: number;
}

export interface OutletComparisonResponse {
  outlets: OutletComparisonItem[];
}

export interface DashboardSummaryResponse {
  revenue: RevenueOverviewResponse;

  retention: CustomerRetentionResponse;

  topItems: TopSellingItem[];

  peakHours: PeakHourItem[];
}

export interface RevenueChartData {
  label: string;

  revenue: number;
}

export interface OrderChartData {
  label: string;

  orders: number;
}

export interface AnalyticsKpi {
  totalRevenue: number;

  totalOrders: number;

  totalCustomers: number;

  averageOrderValue: number;

  retentionRate: number;

  grossProfit: number;
}

export interface AnalyticsRepositoryContract {
  getDashboardSummary(
    filter: DashboardFilterDto
  ): Promise<DashboardSummaryResponse>;

  getRevenueTrend(
    filter: RevenueTrendFilterDto
  ): Promise<RevenueTrendResponse>;

  getTopSellingItems(
    filter: TopItemsFilterDto
  ): Promise<TopSellingItemsResponse>;

  getPeakHours(
    filter: PeakHoursFilterDto
  ): Promise<PeakHoursResponse>;

  getCustomerRetention(
    filter: CustomerRetentionFilterDto
  ): Promise<CustomerRetentionResponse>;

  getOutletComparison(
    filter: OutletComparisonFilterDto
  ): Promise<OutletComparisonResponse>;
}

export interface AnalyticsServiceContract {
  getDashboardSummary(
    filter: DashboardFilterDto
  ): Promise<DashboardSummaryResponse>;

  getRevenueTrend(
    filter: RevenueTrendFilterDto
  ): Promise<RevenueTrendResponse>;

  getTopSellingItems(
    filter: TopItemsFilterDto
  ): Promise<TopSellingItemsResponse>;

  getPeakHours(
    filter: PeakHoursFilterDto
  ): Promise<PeakHoursResponse>;

  getCustomerRetention(
    filter: CustomerRetentionFilterDto
  ): Promise<CustomerRetentionResponse>;

  getOutletComparison(
    filter: OutletComparisonFilterDto
  ): Promise<OutletComparisonResponse>;
}