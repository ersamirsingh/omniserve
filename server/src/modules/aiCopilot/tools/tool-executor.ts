import { AggregationTools } from './aggregation.tools.js';
import { IScopeFilter } from '../router/query-router.js';

export class ToolExecutor {
  /**
   * Executes a registered structured aggregation tool securely.
   * Forces the injected security scope into the tool call parameters.
   */
  static async execute(
    toolName: string,
    rawParams: Record<string, any>,
    securityScope: IScopeFilter
  ): Promise<any> {
    const tenantId = securityScope.tenantId;
    const outletId = securityScope.outletId;


    switch (toolName) {
      case 'getRevenueByPeriod':
        if (!tenantId) throw new Error('Tenant context required for revenue analytics');
        return AggregationTools.getRevenueByPeriod(
          tenantId,
          outletId || rawParams.outletId,
          rawParams.startDate,
          rawParams.endDate
        );

      case 'getOrderCountAndStatus':
        if (!tenantId) throw new Error('Tenant context required for order analytics');
        return AggregationTools.getOrderCountAndStatus(
          tenantId,
          outletId || rawParams.outletId,
          rawParams.startDate,
          rawParams.endDate
        );

      case 'getPaymentSuccessRate':
        if (!tenantId) throw new Error('Tenant context required for payment analytics');
        return AggregationTools.getPaymentSuccessRate(
          tenantId,
          outletId || rawParams.outletId,
          rawParams.startDate,
          rawParams.endDate
        );

      case 'getTopMenuItems':
        if (!tenantId) throw new Error('Tenant context required for product analytics');
        return AggregationTools.getTopMenuItems(
          tenantId,
          outletId || rawParams.outletId,
          rawParams.startDate,
          rawParams.endDate,
          rawParams.limit ? parseInt(rawParams.limit) : 5
        );

      case 'getLowInventoryAlerts':
        if (!tenantId) throw new Error('Tenant context required for inventory analytics');
        return AggregationTools.getLowInventoryAlerts(tenantId, outletId || rawParams.outletId);

      case 'getReviewSentimentTrends':
        if (!tenantId) throw new Error('Tenant context required for sentiment analytics');
        return AggregationTools.getReviewSentimentTrends(tenantId, outletId || rawParams.outletId);

      case 'getPeakHours':
        if (!tenantId) throw new Error('Tenant context required for peak hours analytics');
        return AggregationTools.getPeakHours(tenantId, outletId || rawParams.outletId);

      case 'getCustomerRetention':
        if (!tenantId) throw new Error('Tenant context required for customer retention analytics');
        return AggregationTools.getCustomerRetention(tenantId, outletId || rawParams.outletId);

      case 'getTableTurnoverAndReservations':
        if (!tenantId) throw new Error('Tenant context required for table turnover analytics');
        return AggregationTools.getTableTurnoverAndReservations(tenantId, outletId || rawParams.outletId);

      case 'getOrderVolumeByChannel':
        if (!tenantId) throw new Error('Tenant context required for channel volume analytics');
        return AggregationTools.getOrderVolumeByChannel(tenantId, outletId || rawParams.outletId);

      default:
        throw new Error(`Aggregation tool "${toolName}" is not registered or supported.`);
    }
  }

  /**
   * Returns a schema declaration of all tools to supply to the LLM.
   */
  static getToolsSchema(): any[] {
    return [
      {
        name: 'getRevenueByPeriod',
        description: 'Get total revenue and order count aggregated by day for a tenant and optionally outlet.',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: { type: 'STRING', description: 'ISO date string (e.g. 2026-01-01)' },
            endDate: { type: 'STRING', description: 'ISO date string (e.g. 2026-01-07)' },
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getOrderCountAndStatus',
        description: 'Get status breakdown and count of orders.',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: { type: 'STRING', description: 'ISO date string' },
            endDate: { type: 'STRING', description: 'ISO date string' },
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getPaymentSuccessRate',
        description: 'Get counts of success vs failed payments.',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: { type: 'STRING', description: 'ISO date string' },
            endDate: { type: 'STRING', description: 'ISO date string' },
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getTopMenuItems',
        description: 'Retrieve top sold menu items by quantity.',
        parameters: {
          type: 'OBJECT',
          properties: {
            startDate: { type: 'STRING', description: 'ISO date string' },
            endDate: { type: 'STRING', description: 'ISO date string' },
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
            limit: { type: 'INTEGER', description: 'Number of items to retrieve (default 5)' },
          },
        },
      },
      {
        name: 'getLowInventoryAlerts',
        description: 'Get low stock alerts detailing item name, current level, and threshold.',
        parameters: {
          type: 'OBJECT',
          properties: {
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getReviewSentimentTrends',
        description: 'Get summary statistics of customer reviews grouped by sentiment.',
        parameters: {
          type: 'OBJECT',
          properties: {
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getPeakHours',
        description: 'Get peak order hours heatmap statistics.',
        parameters: {
          type: 'OBJECT',
          properties: {
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getCustomerRetention',
        description: 'Get customer repeat visit and retention rates.',
        parameters: {
          type: 'OBJECT',
          properties: {
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getTableTurnoverAndReservations',
        description: 'Get table turnover rate and average reservation seating duration.',
        parameters: {
          type: 'OBJECT',
          properties: {
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
      {
        name: 'getOrderVolumeByChannel',
        description: 'Get volume of orders placed by sales channels (online, dine-in, takeaway, etc.).',
        parameters: {
          type: 'OBJECT',
          properties: {
            outletId: { type: 'STRING', description: 'Specific outlet ID filter (optional)' },
          },
        },
      },
    ];
  }
}
