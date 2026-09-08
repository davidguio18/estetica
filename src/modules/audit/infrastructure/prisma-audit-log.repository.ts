import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AuditLog, AuditLogData, JsonValue } from '../domain/audit-log.entity';
import {
  AuditLogFilters,
  AuditLogPage,
  AuditLogRepository,
} from '../application/ports/audit-log.repository.port';
import { sanitizeAuditValue } from '../application/sanitize-audit-values';

@Injectable()
export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(auditLog: AuditLog): Promise<void> {
    const data = auditLog.toData();
    await this.prisma.audit_logs.create({
      data: {
        user_id: data.userId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        old_values: toPrismaJson(data.oldValues),
        new_values: toPrismaJson(data.newValues),
        ip_address: data.ipAddress,
      },
    });
  }

  async findMany(filters: AuditLogFilters): Promise<AuditLogPage> {
    const where: Prisma.audit_logsWhereInput = {
      user_id: filters.userId,
      action: filters.action?.toUpperCase(),
      entity_type: filters.entityType?.toUpperCase(),
      entity_id: filters.entityId,
      created_at: {
        gte: filters.from,
        lte: filters.to,
      },
    };
    const skip = (filters.page - 1) * filters.limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return {
      items: rows.map((row) => AuditLog.restore(this.toDomainData(row))),
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  private toDomainData(row: Prisma.audit_logsGetPayload<object>): AuditLogData {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      oldValues: sanitizeAuditValue(toDomainJson(row.old_values)),
      newValues: sanitizeAuditValue(toDomainJson(row.new_values)),
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    };
  }
}

function toPrismaJson(value: JsonValue | null): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function toDomainJson(value: Prisma.JsonValue | null): JsonValue | null {
  return value === null ? null : (value as JsonValue);
}
