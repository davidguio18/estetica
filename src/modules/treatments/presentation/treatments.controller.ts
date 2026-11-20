import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/presentation/security/authenticated-user';
import { JwtAuthenticationGuard } from '../../auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../auth/presentation/security/permissions.guard';
import { RequirePermissions } from '../../auth/presentation/security/required-permissions.decorator';
import { TreatmentsUseCase } from '../application/treatments.use-case';
import { TreatmentInput } from '../application/ports/treatment.repository.port';
import { Treatment } from '../domain/treatment.entity';
import {
  CreateTreatmentDto,
  ListTreatmentsDto,
  TreatmentResponseDto,
  UpdateTreatmentDto,
} from './dto/treatment.dto';
import { TreatmentExceptionFilter } from './filters/treatment-exception.filter';

type RequestWithUser = Request & { user: AuthenticatedUser };

@ApiTags('treatments')
@ApiBearerAuth()
@Controller('treatments')
@UseGuards(JwtAuthenticationGuard, PermissionsGuard)
@UseFilters(TreatmentExceptionFilter)
export class TreatmentsController {
  constructor(private readonly treatments: TreatmentsUseCase) {}

  @Post()
  @RequirePermissions('treatments.create')
  @ApiCreatedResponse({ type: TreatmentResponseDto })
  async create(
    @Body() dto: CreateTreatmentDto,
    @Req() req: RequestWithUser,
  ): Promise<TreatmentResponseDto> {
    return this.response(await this.treatments.create(this.input(dto), req.user.id));
  }

  @Get()
  @RequirePermissions('treatments.read')
  @ApiOkResponse()
  async list(@Query() query: ListTreatmentsDto) {
    const page = await this.treatments.list(query);
    return { ...page, items: page.items.map((item) => this.response(item)) };
  }

  @Get(':id')
  @RequirePermissions('treatments.read')
  async find(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<TreatmentResponseDto> {
    return this.response(await this.treatments.find(id));
  }

  @Patch(':id')
  @RequirePermissions('treatments.update')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateTreatmentDto,
    @Req() req: RequestWithUser,
  ): Promise<TreatmentResponseDto> {
    return this.response(await this.treatments.update(id, this.input(dto), req.user.id));
  }

  @Delete(':id')
  @RequirePermissions('treatments.delete')
  @HttpCode(200)
  async deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<TreatmentResponseDto> {
    return this.response(await this.treatments.deactivate(id, req.user.id));
  }

  private input(dto: CreateTreatmentDto): TreatmentInput;
  private input(dto: UpdateTreatmentDto): Partial<TreatmentInput>;
  private input(
    dto: CreateTreatmentDto | UpdateTreatmentDto,
  ): TreatmentInput | Partial<TreatmentInput> {
    return { ...dto };
  }

  private response(treatment: Treatment): TreatmentResponseDto {
    const data = treatment.toPublicData();
    return {
      id: data.id!,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      durationMinutes: data.durationMinutes,
      price: data.price,
      isActive: data.isActive,
      createdAt: data.createdAt!,
      updatedAt: data.updatedAt!,
    };
  }
}
