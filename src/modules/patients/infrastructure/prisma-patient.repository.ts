import { Inject, Injectable } from '@nestjs/common';
import { patients as PrismaPatient, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AUDIT_LOGGER, AuditLogger } from '../../../shared/ports/audit-logger.port';
import { DuplicatePatientError, PatientNotFoundError } from '../domain/patient.errors';
import { Patient, PatientData } from '../domain/patient.entity';
import {
  PatientPageOptions,
  PatientRepository,
} from '../application/ports/patient.repository.port';

@Injectable()
export class PrismaPatientRepository implements PatientRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}
  async create(patient: Patient, actor: string): Promise<Patient> {
    const data = patient.toData();
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const row = await transaction.patients.create({ data: this.toPersistence(data) });
        const created = Patient.restore(this.toDomain(row));
        await this.recordAudit(transaction, actor, 'PATIENT_CREATED', created);
        return created;
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new DuplicatePatientError();
      throw error;
    }
  }
  async findById(id: string): Promise<Patient | null> {
    const row = await this.prisma.patients.findUnique({ where: { id } });
    return row ? Patient.restore(this.toDomain(row)) : null;
  }
  async update(id: string, input: Partial<PatientData>, actor: string): Promise<Patient> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.patients.findUnique({ where: { id } });
        if (!existing) throw new PatientNotFoundError();
        const previous = Patient.restore(this.toDomain(existing));
        const row = await transaction.patients.update({
          where: { id },
          data: this.toUpdatePersistence(input),
        });
        const updated = Patient.restore(this.toDomain(row));
        await this.recordAudit(transaction, actor, 'PATIENT_UPDATED', updated, previous);
        return updated;
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw new PatientNotFoundError();
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new DuplicatePatientError();
      throw error;
    }
  }
  async deactivate(id: string, actor: string): Promise<Patient> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.patients.findUnique({ where: { id } });
      if (!existing) throw new PatientNotFoundError();
      const previous = Patient.restore(this.toDomain(existing));
      const row = await transaction.patients.update({
        where: { id },
        data: this.toUpdatePersistence({ isActive: false }),
      });
      const deactivated = Patient.restore(this.toDomain(row));
      await this.recordAudit(transaction, actor, 'PATIENT_DEACTIVATED', deactivated, previous);
      return deactivated;
    });
  }
  async findMany(options: PatientPageOptions): Promise<{ items: Patient[]; total: number }> {
    const where: Prisma.patientsWhereInput = {
      is_active: options.isActive,
      OR: options.search
        ? [
            { document_number: { contains: options.search, mode: 'insensitive' } },
            { first_name: { contains: options.search, mode: 'insensitive' } },
            { last_name: { contains: options.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.patients.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.patients.count({ where }),
    ]);
    return { items: items.map((item) => Patient.restore(this.toDomain(item))), total };
  }
  private toPersistence(data: PatientData): Prisma.patientsUncheckedCreateInput {
    return {
      id: data.id,
      document_type: data.documentType,
      document_number: data.documentNumber,
      first_name: data.firstName,
      middle_name: data.middleName,
      last_name: data.lastName,
      second_last_name: data.secondLastName,
      gender: data.gender,
      birth_date: data.birthDate,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      emergency_contact_relationship: data.emergencyContactRelationship,
      is_active: data.isActive,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    };
  }
  private toUpdatePersistence(data: Partial<PatientData>): Prisma.patientsUncheckedUpdateInput {
    return {
      document_type: data.documentType,
      document_number: data.documentNumber,
      first_name: data.firstName,
      middle_name: data.middleName,
      last_name: data.lastName,
      second_last_name: data.secondLastName,
      gender: data.gender,
      birth_date: data.birthDate,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone,
      emergency_contact_relationship: data.emergencyContactRelationship,
      is_active: data.isActive,
      updated_at: new Date(),
    };
  }
  private toDomain(row: PrismaPatient): PatientData {
    return {
      id: row.id,
      documentType: row.document_type,
      documentNumber: row.document_number,
      firstName: row.first_name,
      middleName: row.middle_name,
      lastName: row.last_name,
      secondLastName: row.second_last_name,
      gender: row.gender,
      birthDate: row.birth_date,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: row.city,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      emergencyContactRelationship: row.emergency_contact_relationship,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  private async recordAudit(
    transaction: Prisma.TransactionClient,
    actor: string,
    action: 'PATIENT_CREATED' | 'PATIENT_UPDATED' | 'PATIENT_DEACTIVATED',
    patient: Patient,
    previous?: Patient,
  ): Promise<void> {
    await this.audit.recordInTransaction!(transaction, {
      userId: actor,
      action,
      entityType: 'PATIENT',
      entityId: patient.toData().id,
      oldValues: previous ? this.auditValue(previous) : undefined,
      newValues: this.auditValue(patient),
    });
  }
  private auditValue(patient: Patient): Record<string, unknown> {
    return JSON.parse(JSON.stringify(patient.toPublicData())) as Record<string, unknown>;
  }
}
