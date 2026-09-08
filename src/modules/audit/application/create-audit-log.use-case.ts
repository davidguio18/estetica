import { Inject, Injectable } from '@nestjs/common';
import { AuditLog, CreateAuditLogData } from '../domain/audit-log.entity';
import { AUDIT_LOG_REPOSITORY, AuditLogRepository } from './ports/audit-log.repository.port';
import { AuditLogger } from '../../../shared/ports/audit-logger.port';
import { sanitizeAuditValue } from './sanitize-audit-values';

@Injectable()
export class CreateAuditLogUseCase implements AuditLogger {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: AuditLogRepository) {}

  async record(input: CreateAuditLogData): Promise<void> {
    await this.execute(input);
  }

  async execute(input: CreateAuditLogData): Promise<void> {
    const auditLog = AuditLog.create({
      ...input,
      oldValues: sanitizeAuditValue(input.oldValues),
      newValues: sanitizeAuditValue(input.newValues),
    });
    await this.repository.create(auditLog);
  }
}
