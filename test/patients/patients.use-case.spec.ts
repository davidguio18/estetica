import { BadRequestException } from '@nestjs/common';
import { document_type, gender } from '@prisma/client';
import { PatientsUseCase } from '../../src/modules/patients/application/patients.use-case';
import { PatientRepository } from '../../src/modules/patients/application/ports/patient.repository.port';
import { Patient } from '../../src/modules/patients/domain/patient.entity';
import {
  DuplicatePatientError,
  PatientAlreadyInactiveError,
  PatientNotFoundError,
} from '../../src/modules/patients/domain/patient.errors';

const id = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';
const input = {
  documentType: document_type.CC,
  documentNumber: ' 123 456 ',
  firstName: ' Ana ',
  lastName: ' Pérez ',
  gender: gender.WOMAN,
};
const patient = (isActive = true) =>
  Patient.restore({
    id,
    documentType: document_type.CC,
    documentNumber: '123 456',
    firstName: 'Ana',
    lastName: 'Pérez',
    gender: gender.WOMAN,
    isActive,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

describe('PatientsUseCase', () => {
  let repository: jest.Mocked<PatientRepository>;
  let useCase: PatientsUseCase;
  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      findMany: jest.fn(),
    };
    useCase = new PatientsUseCase(repository);
  });

  it('creates a normalized patient through the repository transaction', async () => {
    repository.create.mockImplementation(async (value) =>
      Patient.restore({ ...value.toData(), id, createdAt: new Date(), updatedAt: new Date() }),
    );
    const result = await useCase.create({ ...input, email: '  ANA.PRUEBA@example.com  ' }, actor);
    expect(result.toData().documentNumber).toBe('123 456');
    expect(result.toData().email).toBe('ana.prueba@example.com');
    expect(repository.create).toHaveBeenCalledWith(expect.any(Patient), actor);
  });

  it.each([{ documentNumber: ' ' }, { firstName: ' ' }, { lastName: ' ' }])(
    'rejects blank required text',
    async (values) => {
      await expect(useCase.create({ ...input, ...values }, actor)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it('rejects a future birth date before persistence', async () => {
    await expect(
      useCase.create({ ...input, birthDate: new Date('2999-01-01') }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('preserves a duplicate-document error from persistence', async () => {
    repository.create.mockRejectedValue(new DuplicatePatientError());
    await expect(useCase.create(input, actor)).rejects.toBeInstanceOf(DuplicatePatientError);
  });

  it('returns not found for an unknown patient', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(useCase.find(id)).rejects.toBeInstanceOf(PatientNotFoundError);
  });

  it('updates through the repository transaction', async () => {
    repository.findById.mockResolvedValue(patient());
    repository.update.mockResolvedValue(patient());
    await useCase.update(id, { phone: '3000000000', email: '  ANA.PRUEBA@example.com  ' }, actor);
    expect(repository.update).toHaveBeenCalledWith(
      id,
      { phone: '3000000000', email: 'ana.prueba@example.com' },
      actor,
    );
  });

  it('soft-deactivates, retaining the patient record and auditing it', async () => {
    repository.findById.mockResolvedValue(patient());
    repository.deactivate.mockResolvedValue(patient(false));
    const result = await useCase.deactivate(id, actor);
    expect(repository.deactivate).toHaveBeenCalledWith(id, actor);
    expect(result.toData().isActive).toBe(false);
  });

  it('reports an explicit error for an already inactive patient', async () => {
    repository.findById.mockResolvedValue(patient(false));
    await expect(useCase.deactivate(id, actor)).rejects.toBeInstanceOf(PatientAlreadyInactiveError);
    expect(repository.deactivate).not.toHaveBeenCalled();
  });
});
