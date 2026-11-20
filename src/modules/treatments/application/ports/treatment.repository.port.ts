import { Treatment } from '../../domain/treatment.entity';

export const TREATMENT_REPOSITORY = Symbol('TREATMENT_REPOSITORY');

export interface TreatmentInput {
  code: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
}

export interface TreatmentPageOptions {
  page: number;
  limit: number;
  isActive?: boolean;
  search?: string;
}

export interface TreatmentRepository {
  create(data: Treatment, actor: string): Promise<Treatment>;
  findById(id: string): Promise<Treatment | null>;
  update(id: string, data: Partial<TreatmentInput>, actor: string): Promise<Treatment>;
  deactivate(id: string, actor: string): Promise<Treatment>;
  findMany(options: TreatmentPageOptions): Promise<{ items: Treatment[]; total: number }>;
}
