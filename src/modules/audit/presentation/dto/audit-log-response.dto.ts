import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JsonValue } from '../../domain/audit-log.entity';

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  userId!: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiPropertyOptional({ nullable: true })
  entityId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  oldValues!: JsonValue | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  newValues!: JsonValue | null;

  @ApiPropertyOptional({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AuditLogPageResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items!: AuditLogResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
