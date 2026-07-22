import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuditLogService } from "./auditLog.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";

export class AuditLogController {

  static async listAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const userIdQuery = req.query.userId as string | undefined;
      const actionQuery = req.query.action as string | undefined;
      const entityTypeQuery = req.query.entityType as string | undefined;
      const fromQuery = req.query.from as string | undefined;
      const toQuery = req.query.to as string | undefined;

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const filters: {
        userId?: string;
        action?: string;
        entityType?: string;
        from?: string;
        to?: string;
        limit: number;
        skip: number;
      } = { limit, skip };

      if (userIdQuery && Types.ObjectId.isValid(userIdQuery)) {
        filters.userId = userIdQuery;
      } else if (userIdQuery) {
        ApiResponseHandler.badRequest(res, 'Invalid userId query filter format');
        return;
      }

      if (actionQuery) {
        filters.action = actionQuery.toUpperCase();
      }
      if (entityTypeQuery) {
        filters.entityType = entityTypeQuery;
      }
      if (fromQuery) {
        filters.from = fromQuery;
      }
      if (toQuery) {
        filters.to = toQuery;
      }

      const { logs, total } = await AuditLogService.getAuditLogs(tenantId, filters);

      ApiResponseHandler.success(res, 200, 'Audit logs retrieved successfully', {
        logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list audit logs');
    }
  }

  static async getAuditLogById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid audit log ID format');
        return;
      }

      const log = await AuditLogService.getAuditLogById(id, tenantId);

      if (!log) {
        ApiResponseHandler.notFound(res, 'Audit log not found or access denied');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Audit log details retrieved successfully', log);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve audit log details');
    }
  }
}
