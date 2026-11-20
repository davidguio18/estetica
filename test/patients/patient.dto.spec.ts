import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreatePatientDto,
  ListPatientsDto,
  UpdatePatientDto,
} from '../../src/modules/patients/presentation/dto/patient.dto';

describe('Patient DTOs', () => {
  const validationPipe = new ValidationPipe({ transform: true });
  const valid = {
    documentType: 'CC',
    documentNumber: '123',
    firstName: 'Ana',
    lastName: 'Pérez',
    gender: 'WOMAN',
  };
  it('accepts the defined document and gender enums', async () =>
    expect(validate(plainToInstance(CreatePatientDto, valid))).resolves.toHaveLength(0));
  it.each([
    { documentType: 'INVALID' },
    { gender: 'INVALID' },
    { documentNumber: '' },
    { firstName: '' },
    { lastName: '' },
  ])('rejects invalid patient input', async (invalid) =>
    expect(
      validate(plainToInstance(CreatePatientDto, { ...valid, ...invalid })),
    ).resolves.not.toHaveLength(0),
  );

  it('normalizes the create email before validating and leaves other fields unchanged', async () => {
    const dto = await validationPipe.transform(
      { ...valid, firstName: ' Ana ', email: '  ANA.PRUEBA@example.com  ' },
      { type: 'body', metatype: CreatePatientDto },
    );

    expect(dto.email).toBe('ana.prueba@example.com');
    expect(dto.firstName).toBe(' Ana ');
  });

  it('continues to accept a valid create email without spaces', async () => {
    const dto = await validationPipe.transform(
      { ...valid, email: 'ana.prueba@example.com' },
      { type: 'body', metatype: CreatePatientDto },
    );

    expect(dto.email).toBe('ana.prueba@example.com');
  });

  it('rejects an invalid create email with 400 Bad Request', async () => {
    await expect(
      validationPipe.transform(
        { ...valid, email: 'not-an-email' },
        { type: 'body', metatype: CreatePatientDto },
      ),
    ).rejects.toMatchObject({ response: { statusCode: 400 } });
  });

  it('normalizes the update email before validating', async () => {
    const dto = await validationPipe.transform(
      { email: '  ANA.PRUEBA@example.com  ' },
      { type: 'body', metatype: UpdatePatientDto },
    );

    expect(dto.email).toBe('ana.prueba@example.com');
  });

  it('rejects an invalid update email with 400 Bad Request', async () => {
    await expect(
      validationPipe.transform(
        { email: 'not-an-email' },
        { type: 'body', metatype: UpdatePatientDto },
      ),
    ).rejects.toMatchObject({ response: { statusCode: 400 } });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses isActive=%s safely', async (value, expected) => {
    const dto = plainToInstance(ListPatientsDto, { isActive: value });
    expect(dto.isActive).toBe(expected);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
