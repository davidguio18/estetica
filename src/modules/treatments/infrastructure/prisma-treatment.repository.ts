import { Inject, Injectable } from '@nestjs/common';
import { Prisma, treatments as PrismaTreatment } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AUDIT_LOGGER, AuditLogger } from '../../../shared/ports/audit-logger.port';
import {
  DuplicateTreatmentCodeError,
  TreatmentAlreadyInactiveError,
  TreatmentNotFoundError,
} from '../domain/treatment.errors';
import { Treatment, TreatmentData } from '../domain/treatment.entity';
import {
  TreatmentInput,
  TreatmentPageOptions,
  TreatmentRepository,
} from '../application/ports/treatment.repository.port';

@Injectable()
export class PrismaTreatmentRepository implements TreatmentRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_LOGGER) private readonly audit: AuditLogger,
  ) {}

  async create(treatment: Treatment, actor: string): Promise<Treatment> {
    const data = treatment.toData();
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const row = await transaction.treatments.create({
          data: this.toCreatePersistence(data),
        });
        const created = Treatment.restore(this.toDomain(row));
        await this.recordAudit(transaction, actor, 'TREATMENT_CREATED', created);
        return created;
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new DuplicateTreatmentCodeError();
      throw error;
    }
  }

  async findById(id: string): Promise<Treatment | null> {
    const row = await this.prisma.treatments.findUnique({ where: { id } });
    return row ? Treatment.restore(this.toDomain(row)) : null;
  }

  async update(id: string, input: Partial<TreatmentInput>, actor: string): Promise<Treatment> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.treatments.findUnique({ where: { id } });
        if (!existing) throw new TreatmentNotFoundError();

        const previous = Treatment.restore(this.toDomain(existing));
        const row = await transaction.treatments.update({
          where: { id },
          data: this.toUpdatePersistence(input),
        });
        const updated = Treatment.restore(this.toDomain(row));
        await this.recordAudit(transaction, actor, 'TREATMENT_UPDATED', updated, previous);
        return updated;
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
        throw new TreatmentNotFoundError();
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new DuplicateTreatmentCodeError();
      throw error;
    }
  }

  async deactivate(id: string, actor: string): Promise<Treatment> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.treatments.findUnique({ where: { id } });
      if (!existing) throw new TreatmentNotFoundError();
      if (!existing.is_active) throw new TreatmentAlreadyInactiveError();

      const previous = Treatment.restore(this.toDomain(existing));
      const row = await transaction.treatments.update({
        where: { id },
        data: { is_active: false, updated_at: new Date() },
      });
      const deactivated = Treatment.restore(this.toDomain(row));
      await this.recordAudit(transaction, actor, 'TREATMENT_DEACTIVATED', deactivated, previous);
      return deactivated;
    });
  }

  async findMany(options: TreatmentPageOptions): Promise<{ items: Treatment[]; total: number }> {
    const where: Prisma.treatmentsWhereInput = {
      is_active: options.isActive,
      OR: options.search
        ? [
            { code: { contains: options.search, mode: 'insensitive' } },
            { name: { contains: options.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.treatments.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.treatments.count({ where }),
    ]);

    return {
      items: items.map((item) => Treatment.restore(this.toDomain(item))),
      total,
    };
  }

  private toCreatePersistence(data: TreatmentData): Prisma.treatmentsUncheckedCreateInput {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      duration_minutes: data.durationMinutes,
      price: data.price,
      is_active: data.isActive,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    };
  }

  private toUpdatePersistence(
    data: Partial<TreatmentInput>,
  ): Prisma.treatmentsUncheckedUpdateInput {
    return {
      code: data.code,
      name: data.name,
      description: data.description,
      duration_minutes: data.durationMinutes,
      price: data.price,
      updated_at: new Date(),
    };
  }

  private toDomain(row: PrismaTreatment): TreatmentData {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      durationMinutes: row.duration_minutes,
      price: Number(row.price),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async recordAudit(
    transaction: Prisma.TransactionClient,
    actor: string,
    action: 'TREATMENT_CREATED' | 'TREATMENT_UPDATED' | 'TREATMENT_DEACTIVATED',
    treatment: Treatment,
    previous?: Treatment,
  ): Promise<void> {
    await this.audit.recordInTransaction!(transaction, {
      userId: actor,
      action,
      entityType: 'TREATMENT',
      entityId: treatment.toData().id,
      oldValues: previous ? this.auditValue(previous) : undefined,
      newValues: this.auditValue(treatment),
    });
  }

  private auditValue(treatment: Treatment): Record<string, unknown> {
    return JSON.parse(JSON.stringify(treatment.toPublicData())) as Record<string, unknown>;
  }
}
