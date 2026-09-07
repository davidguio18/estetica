import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../src/modules/auth/application/ports/user-repository.port';
import { User } from '../../src/modules/auth/domain/user.entity';
import { JwtAuthenticationGuard } from '../../src/modules/auth/presentation/security/jwt-authentication.guard';

const user = User.restore({
  id: '11111111-1111-4111-8111-111111111111',
  username: 'admin',
  email: 'admin@example.com',
  passwordHash: 'private',
  firstName: 'Admin',
  lastName: 'User',
  isActive: true,
  passwordChangedAt: new Date(),
  failedLoginAttempts: 0,
});

const createContext = (authorization?: string): ExecutionContext => {
  const request = {
    header: jest.fn().mockReturnValue(authorization),
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe('JwtAuthenticationGuard', () => {
  let guard: JwtAuthenticationGuard;
  let jwtService: jest.Mocked<JwtService>;
  let repository: jest.Mocked<UserRepository>;
  let request: { user?: unknown };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    repository = {
      findById: jest.fn().mockResolvedValue(user),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      create: jest.fn(),
      recordFailedLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
    };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('a'.repeat(32)),
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthenticationGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: USER_REPOSITORY, useValue: repository },
      ],
    }).compile();
    guard = module.get(JwtAuthenticationGuard);
  });

  it('rejects a missing or malformed bearer token', async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(createContext('Basic token'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects invalid and expired JWTs', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(guard.canActivate(createContext('Bearer invalid'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with an algorithm other than HS256', async () => {
    const realJwtService = new JwtService();
    const token = await realJwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
      },
      { secret: 'a'.repeat(32), algorithm: 'HS384', expiresIn: '15m' },
    );
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('a'.repeat(32)),
    } as unknown as ConfigService;
    const guardWithRealJwt = new JwtAuthenticationGuard(realJwtService, configService, repository);

    await expect(
      guardWithRealJwt.canActivate(createContext(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('validates the user and places only the public principal in request.user', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      username: user.username,
      iat: 1,
      exp: 2,
    });
    const context = createContext('Bearer valid');
    const request = context.switchToHttp().getRequest<{ user?: unknown }>();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid', {
      algorithms: ['HS256'],
      secret: 'a'.repeat(32),
    });
    expect(request.user).toEqual({ id: user.id, username: user.username });
    expect(request.user).not.toHaveProperty('passwordHash');
  });

  it('rejects an unknown or inactive user', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: user.id,
      username: user.username,
      iat: 1,
      exp: 2,
    });
    repository.findById.mockResolvedValueOnce(null);
    await expect(guard.canActivate(createContext('Bearer valid'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    repository.findById.mockResolvedValueOnce(User.restore({ ...user.toData(), isActive: false }));
    await expect(guard.canActivate(createContext('Bearer valid'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
