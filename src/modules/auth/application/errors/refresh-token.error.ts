export class RefreshTokenError extends Error {
  constructor() {
    super('Invalid authentication token');
    this.name = RefreshTokenError.name;
  }
}
