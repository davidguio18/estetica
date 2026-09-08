import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ListAuditLogsUseCase } from '../application/list-audit-logs.use-case';
import { JwtAuthenticationGuard } from '../../auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../auth/presentation/security/permissions.guard';
import { RequirePermissions } from '../../auth/presentation/security/required-permissions.decorator';
import { AuditLogPageResponseDto } from './dto/audit-log-response.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthenticationGuard, PermissionsGuard)
@RequirePermissions('audit.read')
export class AuditController {
  constructor(private readonly listAuditLogsUseCase: ListAuditLogsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'from', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'to', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25, maximum: 100 })
  @ApiOkResponse({ type: AuditLogPageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'User lacks audit.read permission' })
  async list(@Query() query: ListAuditLogsDto): Promise<AuditLogPageResponseDto> {
    const page = await this.listAuditLogsUseCase.execute({
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return {
      ...page,
      items: page.items.map((item) => {
        const data = item.toData();
        return {
          ...data,
          id: data.id as string,
          createdAt: data.createdAt as Date,
        };
      }),
    };
  }
}
