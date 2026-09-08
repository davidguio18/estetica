import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from '../../src/modules/audit/presentation/audit.controller';
import { ListAuditLogsUseCase } from '../../src/modules/audit/application/list-audit-logs.use-case';
import { JwtAuthenticationGuard } from '../../src/modules/auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../src/modules/auth/presentation/security/permissions.guard';
import { REQUIRED_PERMISSIONS } from '../../src/modules/auth/presentation/security/required-permissions.decorator';

describe('AuditController', () => {
  let controller: AuditController;
  const list = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: ListAuditLogsUseCase, useValue: { execute: list } }],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({})
      .overrideGuard(PermissionsGuard)
      .useValue({})
      .compile();
    controller = module.get(AuditController);
    list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 });
  });

  it('passes validated pagination and filters to the use case', async () => {
    await expect(
      controller.list({
        userId: undefined,
        action: 'LOGIN',
        entityType: undefined,
        entityId: undefined,
        from: '2026-01-01T00:00:00.000Z',
        to: undefined,
        page: 2,
        limit: 10,
      }),
    ).resolves.toMatchObject({ page: 1, limit: 25 });
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN',
        page: 2,
        limit: 10,
        from: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('is protected by JWT, audit.read, and exposes no mutation route', () => {
    const guards = Reflect.getMetadata('__guards__', AuditController) as Array<unknown>;
    const permissions = Reflect.getMetadata(REQUIRED_PERMISSIONS, AuditController);
    const methods = Object.getOwnPropertyNames(AuditController.prototype);

    expect(guards).toEqual(expect.arrayContaining([JwtAuthenticationGuard, PermissionsGuard]));
    expect(permissions).toEqual(['audit.read']);
    expect(methods).not.toEqual(expect.arrayContaining(['create', 'update', 'delete', 'remove']));
  });
});
