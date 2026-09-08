import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../../src/modules/audit/audit.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { JwtAuthenticationGuard } from '../../src/modules/auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../src/modules/auth/presentation/security/permissions.guard';

describe('Auth and Audit module wiring', () => {
  it('resolves shared authentication guards from AuthModule', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, AuditModule],
    }).compile();

    expect(module.get(JwtAuthenticationGuard)).toBeDefined();
    expect(module.get(PermissionsGuard)).toBeDefined();
  });
});
