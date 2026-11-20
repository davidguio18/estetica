import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateTreatmentDto,
  ListTreatmentsDto,
  UpdateTreatmentDto,
} from '../../src/modules/treatments/presentation/dto/treatment.dto';

describe('Treatment DTOs', () => {
  const validationPipe = new ValidationPipe({ transform: true });
  const valid = {
    code: ' TR-001 ',
    name: ' Limpieza facial profunda ',
    description: ' Limpieza profunda e hidratacion facial ',
    durationMinutes: 60,
    price: 150000,
  };

  it('normalizes text fields and validates create input', async () => {
    const dto = await validationPipe.transform(valid, {
      type: 'body',
      metatype: CreateTreatmentDto,
    });

    expect(dto).toMatchObject({
      code: 'TR-001',
      name: 'Limpieza facial profunda',
      description: 'Limpieza profunda e hidratacion facial',
      durationMinutes: 60,
      price: 150000,
    });
  });

  it.each([
    { code: '' },
    { name: '' },
    { name: '   ' },
    { durationMinutes: 0 },
    { durationMinutes: -10 },
    { durationMinutes: 1.5 },
    { price: -1 },
  ])('rejects invalid create input: %p', async (invalid) => {
    await expect(
      validationPipe.transform(
        { ...valid, ...invalid },
        { type: 'body', metatype: CreateTreatmentDto },
      ),
    ).rejects.toMatchObject({ response: { statusCode: 400 } });
  });

  it('allows a zero price', async () => {
    const dto = plainToInstance(CreateTreatmentDto, { ...valid, price: 0 });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('normalizes update fields and preserves omitted fields', async () => {
    const dto = await validationPipe.transform(
      { name: '  Nuevo nombre  ', durationMinutes: 45 },
      { type: 'body', metatype: UpdateTreatmentDto },
    );

    expect(dto).toEqual(
      expect.objectContaining({
        name: 'Nuevo nombre',
        durationMinutes: 45,
      }),
    );
  });

  it('rejects invalid update data', async () => {
    await expect(
      validationPipe.transform(
        { durationMinutes: 0, price: -100 },
        { type: 'body', metatype: UpdateTreatmentDto },
      ),
    ).rejects.toMatchObject({ response: { statusCode: 400 } });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses isActive=%s safely', async (value, expected) => {
    const dto = plainToInstance(ListTreatmentsDto, { isActive: value });
    expect(dto.isActive).toBe(expected);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('validates pagination limits', async () => {
    await expect(
      validationPipe.transform(
        { page: 0, limit: 101 },
        { type: 'body', metatype: ListTreatmentsDto },
      ),
    ).rejects.toMatchObject({ response: { statusCode: 400 } });
  });
});
