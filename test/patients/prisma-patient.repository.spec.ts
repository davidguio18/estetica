import { PrismaPatientRepository } from '../../src/modules/patients/infrastructure/prisma-patient.repository';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { document_type, gender } from '@prisma/client';
import { Patient } from '../../src/modules/patients/domain/patient.entity';
import { AuditLogger } from '../../src/shared/ports/audit-logger.port';

const patientId = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';
const row = (active = true, firstName = 'Ana') => ({
  id: patientId,
  document_type: document_type.CC,
  document_number: '123',
  first_name: firstName,
  middle_name: null,
  last_name: 'Perez',
  second_last_name: null,
  gender: gender.WOMAN,
  birth_date: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  is_active: active,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
});
const patient = () =>
  Patient.restore({
    id: patientId,
    documentType: document_type.CC,
    documentNumber: '123',
    firstName: 'Ana',
    lastName: 'Perez',
    gender: gender.WOMAN,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

describe('PrismaPatientRepository list filters', () => {
  it('applies active state, useful search fields, and pagination to both queries', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      patients: { findMany, count },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    };
    const repository = new PrismaPatientRepository(prisma as unknown as PrismaService, {
      record: jest.fn(),
    });

    await repository.findMany({ isActive: false, search: 'Pérez', page: 2, limit: 10 });

    const expectedWhere = {
      is_active: false,
      OR: [
        { document_number: { contains: 'Pérez', mode: 'insensitive' } },
        { first_name: { contains: 'Pérez', mode: 'insensitive' } },
        { last_name: { contains: 'Pérez', mode: 'insensitive' } },
      ],
    };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expectedWhere, skip: 10, take: 10 }),
    );
    expect(count).toHaveBeenCalledWith({ where: expectedWhere });
  });
});

describe('PrismaPatientRepository audited transactions', () => {
  let transaction: { patients: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };
  let prisma: { $transaction: jest.Mock };
  let audit: jest.Mocked<AuditLogger>;
  let repository: PrismaPatientRepository;
  let persistedPatient: ReturnType<typeof row> | null;

  beforeEach(() => {
    persistedPatient = row();
    transaction = {
      patients: {
        create: jest.fn().mockImplementation(async () => {
          persistedPatient = row();
          return persistedPatient;
        }),
        findUnique: jest.fn().mockImplementation(async () => persistedPatient),
        update: jest.fn().mockImplementation(async ({ data }) => {
          if (!persistedPatient) throw new Error('patient not found');
          persistedPatient = {
            ...persistedPatient,
            ...(data.first_name !== undefined ? { first_name: data.first_name } : {}),
            ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
            updated_at: new Date(),
          };
          return persistedPatient;
        }),
      },
    };
    prisma = {
      $transaction: jest.fn((operation: (client: typeof transaction) => Promise<unknown>) => {
        const before = persistedPatient ? { ...persistedPatient } : null;
        return operation(transaction).catch((error: unknown) => {
          persistedPatient = before;
          throw error;
        });
      }),
    };
    audit = { record: jest.fn(), recordInTransaction: jest.fn().mockResolvedValue(undefined) };
    repository = new PrismaPatientRepository(prisma as unknown as PrismaService, audit);
  });

  it('creates the patient and PATIENT_CREATED in one transaction', async () => {
    await repository.create(patient(), actor);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transaction.patients.create).toHaveBeenCalled();
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'PATIENT_CREATED',
        entityId: patientId,
        newValues: expect.any(Object),
      }),
    );
  });

  it('updates the patient and PATIENT_UPDATED with old and new values in one transaction', async () => {
    transaction.patients.update.mockResolvedValue(row(true, 'Ana Maria'));
    await repository.update(patientId, { firstName: 'Ana Maria' }, actor);
    expect(transaction.patients.findUnique).toHaveBeenCalledWith({ where: { id: patientId } });
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'PATIENT_UPDATED',
        oldValues: expect.objectContaining({ firstName: 'Ana' }),
        newValues: expect.objectContaining({ firstName: 'Ana Maria' }),
      }),
    );
  });

  it('deactivates the patient and PATIENT_DEACTIVATED in one transaction', async () => {
    transaction.patients.update.mockResolvedValue(row(false));
    await repository.deactivate(patientId, actor);
    expect(transaction.patients.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ is_active: false }) }),
    );
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'PATIENT_DEACTIVATED',
        oldValues: expect.any(Object),
        newValues: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  it('does not create an audit record when patient persistence fails', async () => {
    transaction.patients.create.mockRejectedValue(new Error('patient write failed'));
    await expect(repository.create(patient(), actor)).rejects.toThrow('patient write failed');
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('does not create an audit record when patient update fails', async () => {
    transaction.patients.update.mockRejectedValue(new Error('patient write failed'));

    await expect(repository.update(patientId, { firstName: 'Ana Maria' }, actor)).rejects.toThrow(
      'patient write failed',
    );

    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('does not create an audit record when patient deactivation fails', async () => {
    transaction.patients.update.mockRejectedValue(new Error('patient write failed'));

    await expect(repository.deactivate(patientId, actor)).rejects.toThrow('patient write failed');

    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('rolls back patient creation when audit creation fails', async () => {
    persistedPatient = null;
    (audit.recordInTransaction as jest.Mock).mockRejectedValue(new Error('audit write failed'));
    await expect(repository.create(patient(), actor)).rejects.toThrow('audit write failed');
    expect(transaction.patients.create).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(persistedPatient).toBeNull();
  });

  it('rolls back patient updates when audit creation fails', async () => {
    const before = { ...persistedPatient! };
    (audit.recordInTransaction as jest.Mock).mockRejectedValue(new Error('audit write failed'));

    await expect(repository.update(patientId, { firstName: 'Ana Maria' }, actor)).rejects.toThrow(
      'audit write failed',
    );

    expect(persistedPatient).toEqual(before);
  });

  it('rolls back patient deactivation when audit creation fails', async () => {
    const before = { ...persistedPatient! };
    (audit.recordInTransaction as jest.Mock).mockRejectedValue(new Error('audit write failed'));

    await expect(repository.deactivate(patientId, actor)).rejects.toThrow('audit write failed');

    expect(persistedPatient).toEqual(before);
  });
});
