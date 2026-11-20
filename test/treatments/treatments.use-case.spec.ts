import { BadRequestException } from '@nestjs/common';
import { TreatmentsUseCase } from '../../src/modules/treatments/application/treatments.use-case';
import { TreatmentRepository } from '../../src/modules/treatments/application/ports/treatment.repository.port';
import { Treatment } from '../../src/modules/treatments/domain/treatment.entity';
import {
  DuplicateTreatmentCodeError,
  TreatmentAlreadyInactiveError,
  TreatmentNotFoundError,
} from '../../src/modules/treatments/domain/treatment.errors';

const id = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';
const input = {
  code: ' TR-001 ',
  name: ' Limpieza facial profunda ',
  description: ' Limpieza profunda ',
  durationMinutes: 60,
  price: 150000,
};

const treatment = (isActive = true) =>
  Treatment.restore({
    id,
    code: 'TR-001',
    name: 'Limpieza facial profunda',
    description: 'Limpieza profunda',
    durationMinutes: 60,
    price: 150000,
    isActive,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

describe('TreatmentsUseCase', () => {
  let repository: jest.Mocked<TreatmentRepository>;
  let useCase: TreatmentsUseCase;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      findMany: jest.fn(),
    };
    useCase = new TreatmentsUseCase(repository);
  });

  it('creates a normalized treatment', async () => {
    repository.create.mockImplementation(async (value) =>
      Treatment.restore({ ...value.toData(), id, createdAt: new Date(), updatedAt: new Date() }),
    );

    const result = await useCase.create(input, actor);

    expect(result.toData()).toMatchObject({
      code: 'TR-001',
      name: 'Limpieza facial profunda',
      isActive: true,
    });
  });

  it('allows a zero price', async () => {
    repository.create.mockResolvedValue(treatment());
    await expect(useCase.create({ ...input, price: 0 }, actor)).resolves.toBeDefined();
  });

  it.each([
    { name: '   ' },
    { code: ' ' },
    { durationMinutes: 0 },
    { durationMinutes: -1 },
    { durationMinutes: 1.5 },
    { price: -1 },
  ])('rejects invalid create input: %p', async (invalid) => {
    await expect(useCase.create({ ...input, ...invalid }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('preserves duplicate-code errors from the repository', async () => {
    repository.create.mockRejectedValue(new DuplicateTreatmentCodeError());
    await expect(useCase.create(input, actor)).rejects.toBeInstanceOf(DuplicateTreatmentCodeError);
  });

  it('lists treatments through the repository', async () => {
    repository.findMany.mockResolvedValue({ items: [treatment()], total: 1 });
    await expect(
      useCase.list({ page: 1, limit: 25, isActive: true, search: 'facial' }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('returns not found for an unknown treatment', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(useCase.find(id)).rejects.toBeInstanceOf(TreatmentNotFoundError);
  });

  it('updates fields while preserving omitted fields', async () => {
    repository.findById.mockResolvedValue(treatment());
    repository.update.mockResolvedValue(treatment());

    await useCase.update(id, { name: '  Nuevo nombre  ' }, actor);

    expect(repository.update).toHaveBeenCalledWith(
      id,
      expect.objectContaining({ name: 'Nuevo nombre' }),
      actor,
    );
  });

  it('rejects updates of an unknown treatment', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(useCase.update(id, { price: 100 }, actor)).rejects.toBeInstanceOf(
      TreatmentNotFoundError,
    );
  });

  it('deactivates logically', async () => {
    repository.findById.mockResolvedValue(treatment());
    repository.deactivate.mockResolvedValue(treatment(false));

    const result = await useCase.deactivate(id, actor);

    expect(result.toData().isActive).toBe(false);
    expect(repository.deactivate).toHaveBeenCalledWith(id, actor);
  });

  it('rejects repeated deactivation', async () => {
    repository.findById.mockResolvedValue(treatment(false));
    await expect(useCase.deactivate(id, actor)).rejects.toBeInstanceOf(
      TreatmentAlreadyInactiveError,
    );
  });
});
