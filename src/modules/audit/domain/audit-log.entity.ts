import { isIP } from 'node:net';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface AuditLogData {
  id?: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: JsonValue | null;
  newValues: JsonValue | null;
  ipAddress: string | null;
  createdAt?: Date;
}

export interface CreateAuditLogData {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: JsonValue | null;
  newValues?: JsonValue | null;
  ipAddress?: string | null;
}

export class InvalidAuditLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidAuditLogError.name;
  }
}

export class AuditLog {
  private constructor(private readonly data: AuditLogData) {}

  static create(input: CreateAuditLogData): AuditLog {
    const action = input.action.trim().toUpperCase();
    const entityType = input.entityType.trim().toUpperCase();

    if (!action || action.length > 100) {
      throw new InvalidAuditLogError('Audit action is invalid');
    }
    if (!entityType || entityType.length > 100) {
      throw new InvalidAuditLogError('Audit entity type is invalid');
    }
    if (input.userId !== null && input.userId !== undefined && !isUuid(input.userId)) {
      throw new InvalidAuditLogError('Audit user ID is invalid');
    }
    if (input.entityId !== null && input.entityId !== undefined && !isUuid(input.entityId)) {
      throw new InvalidAuditLogError('Audit entity ID is invalid');
    }
    if (
      input.ipAddress !== null &&
      input.ipAddress !== undefined &&
      (input.ipAddress.length > 150 || isIP(input.ipAddress) === 0)
    ) {
      throw new InvalidAuditLogError('Audit IP address is invalid');
    }

    return new AuditLog({
      userId: input.userId ?? null,
      action,
      entityType,
      entityId: input.entityId ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  }

  static restore(data: AuditLogData): AuditLog {
    return new AuditLog(data);
  }

  toData(): AuditLogData {
    return { ...this.data };
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
