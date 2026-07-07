import { Types } from 'mongoose';
import AuditLog, { IAuditLog } from "../../models/auditLog.model.js";
import { AuditAction } from "../../models/enums.js";

export class AuditLogService {
  /**
   * Helper to write a new audit log entry
   */
  static async createAuditLog(
    tenantId: string,
    data: {
      userId: string;
      action: AuditAction;
      entityType: string;
      entityId: string;
      oldData?: Record<string, unknown> | null;
      newData?: Record<string, unknown> | null;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<IAuditLog> {
    const audit = new AuditLog({
      tenantId: new Types.ObjectId(tenantId),
      userId: new Types.ObjectId(data.userId),
      action: data.action,
      entityType: data.entityType,
      entityId: new Types.ObjectId(data.entityId),
      oldData: data.oldData || null,
      newData: data.newData || null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      isDeleted: false,
    });

    return await audit.save();
  }

  /**
   * Retrieve list of audit logs under strict tenant isolation
   * Sorted by createdAt descending (newest-first)
   */
  static async getAuditLogs(
    tenantId: string,
    filters: {
      userId?: string;
      action?: string;
      entityType?: string;
      from?: string;
      to?: string;
      limit: number;
      skip: number;
    }
  ): Promise<{ logs: IAuditLog[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        const fromDate = new Date(filters.from);
        fromDate.setUTCHours(0, 0, 0, 0);
        query.createdAt.$gte = fromDate;
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setUTCHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total };
  }

  /**
   * Retrieve a specific audit log details, verifying tenant ownership
   */
  static async getAuditLogById(id: string, tenantId: string): Promise<IAuditLog | null> {
    return await AuditLog.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate('userId', 'firstName lastName email role');
  }
}
