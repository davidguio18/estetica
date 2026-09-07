import { Test, TestingModule } from '@nestjs/testing';
import { InvalidCredentialsError } from '../../src/modules/auth/application/errors/invalid-credentials.error';
import { LoginUseCase } from '../../src/modules/auth/application/login.use-case';
import {
  ACCESS_TOKEN_SIGNER,
  AccessTokenSigner,
} from '../../src/modules/auth/application/ports/access-token-signer.port';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../src/modules/auth/application/ports/password-hasher.port';
import {
  REFRESH_TOKEN_SERVICE,
  RefreshTokenService,
} from '../../src/modules/auth/application/ports/refresh-token.service.port';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../src/modules/auth/application/ports/user-repository.port';
import { User } from '../../src/modules/auth/domain/user.entity';

const createUser = (overrides: Partial<ReturnType<User['toData']>> = {}): User =>
  User.restore({
    id: 'user-id',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    passwordChangedAt: new Date('2026-01-01T00:00:00.000Z'),
    failedLoginAttempts: 0,
    ...overrides,
  });

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let repository: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let accessTokenSigner: jest.Mocked<AccessTokenSigner>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      create: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    passwordHasher = { hash: jest.fn(), verify: jest.fn() };
    accessTokenSigner = {
      sign: jest.fn().mockResolvedValue({ accessToken: 'access', expiresIn: 900 }),
    };
    refreshTokenService = {
      issue: jest.fn().mockResolvedValue({ refreshToken: 'refresh', expiresIn: 604800 }),
      rotate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: USER_REPOSITORY, useValue: repository },
        { provide: PASSWORD_HASHER, useValue: passwordHasher },
        { provide: ACCESS_TOKEN_SIGNER, useValue: accessTokenSigner },
        { provide: REFRESH_TOKEN_SERVICE, useValue: refreshTokenService },
      ],
    }).compile();
    useCase = module.get(LoginUseCase);
  });

  it('authenticates valid credentials and issues both tokens', async () => {
    const user = createUser();
    repository.findByUsername.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(true);
    repository.recordSuccessfulLogin.mockResolvedValue(user);

    await expect(useCase.execute({ username: ' ADMIN ', password: 'secret' })).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    });
    expect(repository.recordSuccessfulLogin).toHaveBeenCalledWith(user, expect.any(Date));
    expect(accessTokenSigner.sign).toHaveBeenCalledWith(user);
    expect(refreshTokenService.issue).toHaveBeenCalledWith('user-id');
  });

  it('returns the same generic error for an unknown username', async () => {
    repository.findByUsername.mockResolvedValue(null);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(useCase.execute({ username: 'missing', password: 'wrong' })).rejects.toEqual(
      new InvalidCredentialsError(),
    );
    expect(repository.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('records the failed attempt so PostgreSQL can atomically lock after the fifth failure', async () => {
    const user = createUser({ failedLoginAttempts: 4 });
    repository.findByUsername.mockResolvedValue(user);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(useCase.execute({ username: 'admin', password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(repository.recordFailedLogin).toHaveBeenCalledWith(user);
  });

  it('does not record another attempt while an existing lock is active', async () => {
    const user = createUser({
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    repository.findByUsername.mockResolvedValue(user);

    await expect(useCase.execute({ username: 'admin', password: 'wrong' })).rejects.toEqual(
      new InvalidCredentialsError(),
    );
    expect(passwordHasher.verify).toHaveBeenCalledWith(user.passwordHash, 'wrong');
    expect(repository.recordFailedLogin).not.toHaveBeenCalled();
  });

  it('rejects inactive and currently locked users without issuing tokens', async () => {
    const inactiveUser = createUser({ isActive: false });
    repository.findByUsername.mockResolvedValue(inactiveUser);
    await expect(useCase.execute({ username: 'admin', password: 'secret' })).rejects.toEqual(
      new InvalidCredentialsError(),
    );

    const lockedUser = createUser({ lockedUntil: new Date(Date.now() + 60_000) });
    repository.findByUsername.mockResolvedValue(lockedUser);
    await expect(useCase.execute({ username: 'admin', password: 'secret' })).rejects.toEqual(
      new InvalidCredentialsError(),
    );
  });
});
