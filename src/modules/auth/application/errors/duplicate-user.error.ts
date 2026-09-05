export type DuplicateUserField = 'username' | 'email';

export class DuplicateUserError extends Error {
  constructor(public readonly field: DuplicateUserField) {
    super(`User ${field} already exists`);
    this.name = DuplicateUserError.name;
  }
}
