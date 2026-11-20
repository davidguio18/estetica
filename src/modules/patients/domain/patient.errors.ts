export class PatientNotFoundError extends Error {
  constructor() {
    super('Patient not found');
  }
}
export class DuplicatePatientError extends Error {
  constructor() {
    super('A patient with this document already exists');
  }
}
export class PatientAlreadyInactiveError extends Error {
  constructor() {
    super('Patient is already inactive');
  }
}
