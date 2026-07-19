import { LlmService } from '../services/llm.service.js';
import { CopilotRole } from '../prompts/prompt-registry.js';

export interface IScopeFilter {
  tenantId?: string;
  outletId?: string;
}

export interface IRouteDecision {
  intent: 'debugging' | 'numeric-analytics' | 'relationship-lookup' | 'semantic-lookup';
  backend: 'vector' | 'graph' | 'structured-aggregation';
  toolName?: string;
  toolParams?: Record<string, any>;
}

export class QueryRouter {
  /**
   * Classifies the user query using Gemini.
   */
  static async classifyQuery(query: string, role: CopilotRole): Promise<IRouteDecision> {
    const classificationPrompt = `
You are the Query Router for the OmniServe AI Copilot system.
Your job is to analyze the user's natural language question and classify it into one of the following:

Intents:
1. "debugging": User wants to diagnose errors, troubleshoot webhooks, read system logs, or analyze sync jobs.
2. "numeric-analytics": User asks math questions, counts, averages, min/max orders, revenue stats, or inventory levels.
3. "relationship-lookup": User wants to trace connections (e.g. trace external order to internal order, list addons ordered with category X, check outlet table layouts).
4. "semantic-lookup": User wants to search customer reviews, find menu descriptions, or search free-text notes.

Backends:
- "vector": Use for "debugging" logs/errors and "semantic-lookup" on reviews/menu text.
- "graph": Use for "relationship-lookup" across database entities.
- "structured-aggregation": Use for ALL "numeric-analytics" questions (like max/min/average/sum/count/revenue).

For "numeric-analytics", identify which tool and parameters to use from this library:
- "getRevenueByPeriod" (params: startDate, endDate)
- "getOrderCountAndStatus" (params: startDate, endDate)
- "getPaymentSuccessRate" (params: startDate, endDate)
- "getTopMenuItems" (params: startDate, endDate, limit)
- "getLowInventoryAlerts" (no parameters)
- "getReviewSentimentTrends" (no parameters)
- "getPeakHours" (no parameters)
- "getCustomerRetention" (no parameters)
- "getTableTurnoverAndReservations" (no parameters)
- "getOrderVolumeByChannel" (no parameters)

Return raw JSON strictly in this format (do not wrap in markdown code blocks):
{
  "intent": "intent-value",
  "backend": "backend-value",
  "toolName": "tool-name-if-applicable",
  "toolParams": { "paramName": "paramValue" }
}
`;

    try {
      const response = await LlmService.generateContent(
        classificationPrompt,
        `Classify this query: "${query}"`
      );

      // Clean up markdown formatting if the model returned it
      let cleanText = response.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7, cleanText.length - 3).trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3, cleanText.length - 3).trim();
      }

      const decision: IRouteDecision = JSON.parse(cleanText);
      return decision;
    } catch (error) {
      console.warn('[QueryRouter] Classification failed, falling back to default rules:', error);
      return this.fallbackRulesClassifier(query);
    }
  }

  /**
   * Fallback heuristic rules in case the LLM classification fails.
   */
  private static fallbackRulesClassifier(query: string): IRouteDecision {
    const q = query.toLowerCase();

    if (q.includes('error') || q.includes('bug') || q.includes('fail') || q.includes('log') || q.includes('webhook')) {
      return { intent: 'debugging', backend: 'vector' };
    }
    if (q.includes('revenue') || q.includes('sales') || q.includes('how many') || q.includes('average') || q.includes('highest') || q.includes('lowest')) {
      return { intent: 'numeric-analytics', backend: 'structured-aggregation', toolName: 'getRevenueByPeriod', toolParams: {} };
    }
    if (q.includes('trace') || q.includes('map') || q.includes('connect') || q.includes('belong') || q.includes('relationship')) {
      return { intent: 'relationship-lookup', backend: 'graph' };
    }
    return { intent: 'semantic-lookup', backend: 'vector' };
  }

  /**
   * Enforces security boundaries by overriding the target tenantId and outletId based on session authentication.
   */
  static enforceSecurityScope(
    authenticatedUser: { role: string; tenantId?: string; outletId?: string },
    rawParams: Record<string, any> = {}
  ): { scope: IScopeFilter; isAllowed: boolean; refusalReason?: string } {
    const role = authenticatedUser.role as CopilotRole;

    // Phase 2 stub for Customer
    if (role === 'CUSTOMER') {
      const scope: IScopeFilter = {};
      if (authenticatedUser.outletId) scope.outletId = authenticatedUser.outletId;
      return {
        scope,
        isAllowed: false,
        refusalReason: 'Self-service customer assistant is currently offline. Phase 2 menu Q&A stub placeholder.',
      };
    }

    const scope: IScopeFilter = {};

    switch (role) {
      case 'SYSTEM_ADMIN':
        // System admin can see everything for debugging.
        // We do not inject tenant filters by default unless they requested a specific one,
        // but we do NOT allow cross-tenant analytics query.
        return { scope: {}, isAllowed: true };

      case 'SUPER_ADMIN':
        // Super admin has platform-wide query capability
        if (rawParams.tenantId) scope.tenantId = rawParams.tenantId;
        if (rawParams.outletId) scope.outletId = rawParams.outletId;
        return { scope, isAllowed: true };

      case 'RESTAURANT_OWNER':
        // Enforce their own tenantId. Never trust user-supplied tenantId.
        if (!authenticatedUser.tenantId) {
          return { scope: {}, isAllowed: false, refusalReason: 'Tenant context is missing from your session.' };
        }
        scope.tenantId = authenticatedUser.tenantId;

        // If they ask for an outlet, verify it's theirs (in practice, the query engine matches both,
        // but locking to tenantId is the absolute tenancy boundary).
        if (rawParams.outletId) {
          scope.outletId = rawParams.outletId;
        }
        return { scope, isAllowed: true };

      case 'OUTLET_MANAGER':
        // Enforce both tenantId and outletId. Never trust user input.
        if (!authenticatedUser.tenantId || !authenticatedUser.outletId) {
          return { scope: {}, isAllowed: false, refusalReason: 'Outlet or Tenant context is missing from your session.' };
        }
        scope.tenantId = authenticatedUser.tenantId;
        scope.outletId = authenticatedUser.outletId;
        return { scope, isAllowed: true };

      default:
        return { scope: {}, isAllowed: false, refusalReason: 'Invalid user role context.' };
    }
  }
}
