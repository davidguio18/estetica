import { document_type, gender } from '@prisma/client';

export interface PatientData {
  id?: string;
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
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Patient {
  private constructor(private readonly data: PatientData) {}

  static create(data: Omit<PatientData, 'isActive'> & { isActive?: boolean }): Patient {
    return new Patient({ ...normalizePatientData(data), isActive: data.isActive ?? true });
  }

  static restore(data: PatientData): Patient {
    return new Patient(data);
  }

  toData(): PatientData {
    return { ...this.data };
  }

  toPublicData(): PatientData {
    return this.toData();
  }
}

export function normalizePatientData<T extends Partial<PatientData>>(data: T): T {
  const normalize = (value: string | null | undefined): string | null | undefined => {
    if (value === undefined || value === null) return value;
    const trimmed = value.trim();
    return trimmed || null;
  };
  return {
    ...data,
    documentNumber: data.documentNumber
      ? data.documentNumber.trim().replace(/\s+/g, ' ').toUpperCase()
      : data.documentNumber,
    firstName: normalize(data.firstName),
    middleName: normalize(data.middleName),
    lastName: normalize(data.lastName),
    secondLastName: normalize(data.secondLastName),
    phone: normalize(data.phone),
    email: normalize(data.email)?.toLowerCase(),
    address: normalize(data.address),
    city: normalize(data.city),
    emergencyContactName: normalize(data.emergencyContactName),
    emergencyContactPhone: normalize(data.emergencyContactPhone),
    emergencyContactRelationship: normalize(data.emergencyContactRelationship),
  } as T;
}
