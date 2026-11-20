export class TreatmentNotFoundError extends Error {
  constructor() {
    super('Treatment not found');
  }
}

export class DuplicateTreatmentCodeError extends Error {
  constructor() {
    super('A treatment with this code already exists');
  }
}

export class TreatmentAlreadyInactiveError extends Error {
  constructor() {
    super('Treatment is already inactive');
  }
}
