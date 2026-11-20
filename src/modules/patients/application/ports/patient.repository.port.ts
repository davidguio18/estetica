import { document_type, gender } from '@prisma/client';
import { Patient } from '../../domain/patient.entity';

export const PATIENT_REPOSITORY = Symbol('PATIENT_REPOSITORY');
export interface PatientPageOptions {
  page: number;
  limit: number;
  isActive?: boolean;
  search?: string;
}
export interface PatientInput {
  documentType: document_type;
  documentNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  secondLastName?: string | null;
  gender: gender;
  birthDate?: Date | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
}
export interface PatientRepository {
  create(data: Patient, actor: string): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  update(id: string, data: Partial<PatientInput>, actor: string): Promise<Patient>;
  deactivate(id: string, actor: string): Promise<Patient>;
  findMany(options: PatientPageOptions): Promise<{ items: Patient[]; total: number }>;
}
