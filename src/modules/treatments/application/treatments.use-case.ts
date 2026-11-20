import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TreatmentAlreadyInactiveError, TreatmentNotFoundError } from '../domain/treatment.errors';
import { normalizeTreatmentData, Treatment } from '../domain/treatment.entity';
import {
  TREATMENT_REPOSITORY,
  TreatmentInput,
  TreatmentPageOptions,
  TreatmentRepository,
} from './ports/treatment.repository.port';

@Injectable()
export class TreatmentsUseCase {
  constructor(@Inject(TREATMENT_REPOSITORY) private readonly repository: TreatmentRepository) {}

  async create(input: TreatmentInput, actor: string): Promise<Treatment> {
    this.validateText(input);
    this.validateDurationAndPrice(input.durationMinutes, input.price);
    return this.repository.create(Treatment.create(input), actor);
  }

  list(options: TreatmentPageOptions) {
    return this.repository.findMany(options);
  }

  async find(id: string): Promise<Treatment> {
    return this.require(id);
  }

  async update(id: string, input: Partial<TreatmentInput>, actor: string): Promise<Treatment> {
    this.validateText(input);
    this.validateDurationAndPrice(input.durationMinutes, input.price);
    await this.require(id);
    return this.repository.update(id, normalizeTreatmentData(input), actor);
  }

  async deactivate(id: string, actor: string): Promise<Treatment> {
    const previous = await this.require(id);
    if (!previous.toData().isActive) throw new TreatmentAlreadyInactiveError();
    return this.repository.deactivate(id, actor);
  }

  private async require(id: string): Promise<Treatment> {
    const treatment = await this.repository.findById(id);
    if (!treatment) throw new TreatmentNotFoundError();
    return treatment;
  }

  private validateText(input: Partial<TreatmentInput>): void {
    for (const [field, value] of Object.entries({
      code: input.code,
      name: input.name,
    })) {
      if (value !== undefined && (!value || !value.trim()))
        throw new BadRequestException(`${field} cannot be blank`);
    }
  }

  private validateDurationAndPrice(
    durationMinutes: number | undefined,
    price: number | undefined,
  ): void {
    if (
      durationMinutes !== undefined &&
      (!Number.isInteger(durationMinutes) || durationMinutes <= 0)
    )
      throw new BadRequestException('durationMinutes must be an integer greater than zero');
    if (price !== undefined && (!Number.isFinite(price) || price < 0))
      throw new BadRequestException('price must be greater than or equal to zero');
  }
}
