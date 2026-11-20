import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PatientAlreadyInactiveError, PatientNotFoundError } from '../domain/patient.errors';
import { normalizePatientData, Patient } from '../domain/patient.entity';
import {
  PATIENT_REPOSITORY,
  PatientInput,
  PatientPageOptions,
  PatientRepository,
} from './ports/patient.repository.port';

@Injectable()
export class PatientsUseCase {
  constructor(@Inject(PATIENT_REPOSITORY) private readonly repository: PatientRepository) {}

  async create(input: PatientInput, actor: string): Promise<Patient> {
    this.validateRequiredText(input);
    this.validateBirthDate(input.birthDate);
    return this.repository.create(Patient.create(input), actor);
  }
  list(options: PatientPageOptions) {
    return this.repository.findMany(options);
  }
  async find(id: string) {
    return this.require(id);
  }
  async update(id: string, input: Partial<PatientInput>, actor: string): Promise<Patient> {
    this.validateRequiredText(input);
    this.validateBirthDate(input.birthDate);
    await this.require(id);
    return this.repository.update(id, normalizePatientData(input), actor);
  }
  async deactivate(id: string, actor: string): Promise<Patient> {
    const previous = await this.require(id);
    if (!previous.toData().isActive) throw new PatientAlreadyInactiveError();
    return this.repository.deactivate(id, actor);
  }
  private async require(id: string): Promise<Patient> {
    const patient = await this.repository.findById(id);
    if (!patient) throw new PatientNotFoundError();
    return patient;
  }
  private validateBirthDate(date: Date | null | undefined) {
    if (date && date > endOfToday())
      throw new BadRequestException('Birth date cannot be in the future');
  }
  private validateRequiredText(input: Partial<PatientInput>) {
    for (const [field, value] of Object.entries({
      documentNumber: input.documentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
    })) {
      if (value !== undefined && !value.trim())
        throw new BadRequestException(`${field} cannot be blank`);
    }
  }
}

function endOfToday(): Date {
  const value = new Date();
  value.setHours(23, 59, 59, 999);
  return value;
}
