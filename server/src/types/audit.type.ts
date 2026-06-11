export interface IQueryAuditLogs {
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
}
