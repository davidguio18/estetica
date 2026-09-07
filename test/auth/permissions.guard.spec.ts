import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  USER_AUTHORIZATION,
  UserAuthorizationPort,
} from '../../src/modules/auth/application/ports/user-authorization.port';
import { PermissionsGuard } from '../../src/modules/auth/presentation/security/permissions.guard';

const createContext = (user?: { id: string; username: string }): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let authorization: jest.Mocked<UserAuthorizationPort>;

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    authorization = { getPermissions: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: reflector },
        { provide: USER_AUTHORIZATION, useValue: authorization },
      ],
    }).compile();
    guard = module.get(PermissionsGuard);
  });

  it('allows endpoints without required permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(authorization.getPermissions).not.toHaveBeenCalled();
  });

  it('returns 401 when used without an authenticated principal', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users.read']);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requires all declared permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['users.read', 'users.update']);
    authorization.getPermissions.mockResolvedValue(['users.read']);
    const context = createContext({ id: 'user-id', username: 'admin' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);

    authorization.getPermissions.mockResolvedValue(['users.read', 'users.update', 'users.read']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
