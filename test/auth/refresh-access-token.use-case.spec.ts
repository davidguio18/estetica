import { Test, TestingModule } from '@nestjs/testing';
import { InvalidCredentialsError } from '../../src/modules/auth/application/errors/invalid-credentials.error';
import { RefreshAccessTokenUseCase } from '../../src/modules/auth/application/refresh-access-token.use-case';
import {
  ACCESS_TOKEN_SIGNER,
  AccessTokenSigner,
} from '../../src/modules/auth/application/ports/access-token-signer.port';
import {
  REFRESH_TOKEN_SERVICE,
  RefreshTokenService,
} from '../../src/modules/auth/application/ports/refresh-token.service.port';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../src/modules/auth/application/ports/user-repository.port';
import { User } from '../../src/modules/auth/domain/user.entity';

describe('RefreshAccessTokenUseCase', () => {
  let useCase: RefreshAccessTokenUseCase;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;
  let repository: jest.Mocked<UserRepository>;
  let accessTokenSigner: jest.Mocked<AccessTokenSigner>;
  const user = User.restore({
    id: 'user-id',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    passwordChangedAt: new Date(),
    failedLoginAttempts: 0,
  });

  beforeEach(async () => {
    refreshTokenService = {
      issue: jest.fn(),
      rotate: jest.fn().mockResolvedValue({
        userId: 'user-id',
        refreshToken: 'new-refresh',
        expiresIn: 604800,
      }),
    };
    repository = {
      findById: jest.fn().mockResolvedValue(user),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      create: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    accessTokenSigner = {
      sign: jest.fn().mockResolvedValue({ accessToken: 'new-access', expiresIn: 900 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshAccessTokenUseCase,
        { provide: REFRESH_TOKEN_SERVICE, useValue: refreshTokenService },
        { provide: USER_REPOSITORY, useValue: repository },
        { provide: ACCESS_TOKEN_SIGNER, useValue: accessTokenSigner },
      ],
    }).compile();
    useCase = module.get(RefreshAccessTokenUseCase);
  });

  it('rotates the refresh token and issues a new access token', async () => {
    await expect(useCase.execute({ refreshToken: 'old-refresh' })).resolves.toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 900,
    });
    expect(refreshTokenService.rotate).toHaveBeenCalledWith('old-refresh');
  });

  it('does not issue an access token when the associated user is inactive', async () => {
    repository.findById.mockResolvedValue(User.restore({ ...user.toData(), isActive: false }));

    await expect(useCase.execute({ refreshToken: 'old-refresh' })).rejects.toEqual(
      new InvalidCredentialsError(),
    );
    expect(accessTokenSigner.sign).not.toHaveBeenCalled();
  });
});
