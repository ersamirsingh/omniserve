export interface DomainEvent<T = Record<string, unknown>> {
  name: string;
  aggregateId?: string;
  tenantId?: string;
  outletId?: string;
  payload: T;
  occurredAt: Date;
}
