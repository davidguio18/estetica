import { AuditLog } from '../../domain/audit-log.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogRepository {
  create(auditLog: AuditLog): Promise<void>;
  findMany(filters: AuditLogFilters): Promise<AuditLogPage>;
}
