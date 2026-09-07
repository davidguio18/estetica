import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAccessTokenSigner } from '../../src/modules/auth/infrastructure/jwt-access-token.signer';
import { User } from '../../src/modules/auth/domain/user.entity';

describe('JwtAccessTokenSigner', () => {
  it('uses configured secret and lifetime with minimal claims', async () => {
    const config = {
      getOrThrow: jest.fn((key: string): string => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'a'.repeat(32),
          JWT_ACCESS_EXPIRES_IN: '15m',
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    const jwtService = new JwtService();
    const signer = new JwtAccessTokenSigner(jwtService, config);
    const user = User.restore({
      id: 'user-id',
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: 'never-in-token',
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
    });

    const result = await signer.sign(user);
    const payload = await jwtService.verifyAsync(result.accessToken, {
      secret: 'a'.repeat(32),
    });

    expect(result.expiresIn).toBe(900);
    expect(payload).toMatchObject({ sub: 'user-id', username: 'admin' });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('passwordHash');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
  });
});
