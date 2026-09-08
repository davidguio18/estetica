import { Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogFilters,
  AuditLogPage,
  AuditLogRepository,
} from './ports/audit-log.repository.port';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(@Inject(AUDIT_LOG_REPOSITORY) private readonly repository: AuditLogRepository) {}

  execute(filters: AuditLogFilters): Promise<AuditLogPage> {
    return this.repository.findMany(filters);
  }
}
