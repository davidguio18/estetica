import { Prisma } from '@prisma/client';

export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
}

export interface AuditLogger {
  record(input: AuditLogInput): Promise<void>;
  recordInTransaction?(transaction: Prisma.TransactionClient, input: AuditLogInput): Promise<void>;
}
