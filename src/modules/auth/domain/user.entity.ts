export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface UserData {
  id?: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  passwordChangedAt: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class InvalidUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = InvalidUserError.name;
  }
}

export class User {
  private constructor(private readonly data: UserData) {}

  static create(input: CreateUserData): User {
    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();

    if (!/^[a-z0-9._-]{3,100}$/.test(username)) {
      throw new InvalidUserError('Username format is invalid');
    }
    if (!email || email.length > 255 || !email.includes('@')) {
      throw new InvalidUserError('Email format is invalid');
    }
    if (!input.passwordHash) {
      throw new InvalidUserError('Password hash is required');
    }
    if (!firstName || firstName.length > 100) {
      throw new InvalidUserError('First name is invalid');
    }
    if (!lastName || lastName.length > 100) {
      throw new InvalidUserError('Last name is invalid');
    }

    return new User({
      username,
      email,
      passwordHash: input.passwordHash,
      firstName,
      lastName,
      isActive: true,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
    });
  }

  static restore(data: UserData): User {
    return new User(data);
  }

  toData(): UserData {
    return { ...this.data };
  }

  get id(): string | undefined {
    return this.data.id;
  }

  get username(): string {
    return this.data.username;
  }

  get passwordHash(): string {
    return this.data.passwordHash;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }

  get lockedUntil(): Date | undefined {
    return this.data.lockedUntil;
  }

  get failedLoginAttempts(): number {
    return this.data.failedLoginAttempts;
  }

  toPublicData(): Omit<UserData, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...publicData } = this.data;
    return publicData;
  }
}
