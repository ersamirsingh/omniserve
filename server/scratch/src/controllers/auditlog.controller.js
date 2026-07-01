import { Types } from 'mongoose';
import { AuditLogService } from '../services/auditlog.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
export class AuditLogController {
    /**
     * Retrieve paginated list of audit logs for the tenant
     * GET /audit-logs
     */
    static async listAuditLogs(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const userIdQuery = req.query.userId;
            const actionQuery = req.query.action;
            const entityTypeQuery = req.query.entityType;
            const fromQuery = req.query.from;
            const toQuery = req.query.to;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            // Construct filter object dynamically to support exactOptionalPropertyTypes: true
            const filters = { limit, skip };
            if (userIdQuery && Types.ObjectId.isValid(userIdQuery)) {
                filters.userId = userIdQuery;
            }
            else if (userIdQuery) {
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to list audit logs');
        }
    }
    /**
     * Retrieve a specific audit log details
     * GET /audit-logs/:id
     */
    static async getAuditLogById(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const id = req.params.id;
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve audit log details');
        }
    }
}
