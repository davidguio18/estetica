export interface TreatmentData {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Treatment {
  private constructor(private readonly data: TreatmentData) {}

  static create(data: Omit<TreatmentData, 'isActive'> & { isActive?: boolean }): Treatment {
    return new Treatment({
      ...normalizeTreatmentData(data),
      isActive: data.isActive ?? true,
    });
  }

  static restore(data: TreatmentData): Treatment {
    return new Treatment(normalizeTreatmentData(data));
  }

  toData(): TreatmentData {
    return { ...this.data };
  }

  toPublicData(): TreatmentData {
    return this.toData();
  }
}

export function normalizeTreatmentData<T extends Partial<TreatmentData>>(data: T): T {
  const normalizeText = (value: string | null | undefined): string | null | undefined => {
    if (value === undefined || value === null) return value;
    const trimmed = value.trim();
    return trimmed || null;
  };

  return {
    ...data,
    code: normalizeText(data.code),
    name: normalizeText(data.name),
    description: normalizeText(data.description),
  } as T;
}
