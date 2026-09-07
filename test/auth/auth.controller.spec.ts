import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AuthController } from '../../src/modules/auth/presentation/auth.controller';
import { CreateUserUseCase } from '../../src/modules/auth/application/create-user.use-case';
import { LoginUseCase } from '../../src/modules/auth/application/login.use-case';
import { RefreshAccessTokenUseCase } from '../../src/modules/auth/application/refresh-access-token.use-case';
import { JwtAuthenticationGuard } from '../../src/modules/auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../src/modules/auth/presentation/security/permissions.guard';

describe('AuthController protected identity', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: CreateUserUseCase, useValue: {} },
        { provide: LoginUseCase, useValue: {} },
        { provide: RefreshAccessTokenUseCase, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({})
      .overrideGuard(PermissionsGuard)
      .useValue({})
      .compile();
    controller = module.get(AuthController);
  });

  it('returns only the authenticated public principal from /auth/me', () => {
    const request = {
      user: { id: 'user-id', username: 'admin' },
    } as Request & { user: { id: string; username: string } };
    const result = controller.me(request);

    expect(result).toEqual({ id: 'user-id', username: 'admin' });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('refreshToken');
  });
});
