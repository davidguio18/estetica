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
import { PatientsUseCase } from '../application/patients.use-case';
import { JwtAuthenticationGuard } from '../../auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../auth/presentation/security/permissions.guard';
import { RequirePermissions } from '../../auth/presentation/security/required-permissions.decorator';
import { AuthenticatedUser } from '../../auth/presentation/security/authenticated-user';
import {
  CreatePatientDto,
  ListPatientsDto,
  PatientResponseDto,
  UpdatePatientDto,
} from './dto/patient.dto';
import { PatientExceptionFilter } from './filters/patient-exception.filter';
import { Patient } from '../domain/patient.entity';
import { PatientInput } from '../application/ports/patient.repository.port';

type RequestWithUser = Request & { user: AuthenticatedUser };
@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAuthenticationGuard, PermissionsGuard)
@UseFilters(PatientExceptionFilter)
export class PatientsController {
  constructor(private readonly patients: PatientsUseCase) {}
  @Post()
  @RequirePermissions('patients.create')
  @ApiCreatedResponse({ type: PatientResponseDto })
  async create(
    @Body() dto: CreatePatientDto,
    @Req() req: RequestWithUser,
  ): Promise<PatientResponseDto> {
    return this.response(await this.patients.create(this.input(dto), req.user.id));
  }
  @Get() @RequirePermissions('patients.read') @ApiOkResponse() async list(
    @Query() query: ListPatientsDto,
  ) {
    const page = await this.patients.list(query);
    return { ...page, items: page.items.map((item) => this.response(item)) };
  }
  @Get(':id') @RequirePermissions('patients.read') async find(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<PatientResponseDto> {
    return this.response(await this.patients.find(id));
  }
  @Patch(':id') @RequirePermissions('patients.update') async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: RequestWithUser,
  ): Promise<PatientResponseDto> {
    return this.response(await this.patients.update(id, this.input(dto), req.user.id));
  }
  @Delete(':id') @RequirePermissions('patients.delete') @HttpCode(200) async deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ): Promise<PatientResponseDto> {
    return this.response(await this.patients.deactivate(id, req.user.id));
  }
  private input(dto: CreatePatientDto): PatientInput;
  private input(dto: UpdatePatientDto): Partial<PatientInput>;
  private input(dto: CreatePatientDto | UpdatePatientDto): PatientInput | Partial<PatientInput> {
    return { ...dto, birthDate: dto.birthDate === undefined ? undefined : new Date(dto.birthDate) };
  }
  private response(patient: Patient): PatientResponseDto {
    const data = patient.toPublicData();
    return {
      id: data.id!,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      firstName: data.firstName,
      middleName: data.middleName ?? null,
      lastName: data.lastName,
      secondLastName: data.secondLastName ?? null,
      gender: data.gender,
      birthDate: data.birthDate ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      emergencyContactRelationship: data.emergencyContactRelationship ?? null,
      isActive: data.isActive,
      createdAt: data.createdAt!,
      updatedAt: data.updatedAt!,
    };
  }
}
