import { PrismaService } from '../../src/shared/database/prisma.service';
import { PrismaUserAuthorizationRepository } from '../../src/modules/auth/infrastructure/prisma-user-authorization.repository';

describe('PrismaUserAuthorizationRepository', () => {
  it('returns unique permissions from active roles in one Prisma query', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        roles: {
          is_active: true,
          role_permissions: [
            { permissions: { code: 'users.read' } },
            { permissions: { code: 'inventory.read' } },
          ],
        },
      },
      {
        roles: {
          is_active: true,
          role_permissions: [
            { permissions: { code: 'users.read' } },
            { permissions: { code: 'users.update' } },
          ],
        },
      },
      {
        roles: {
          is_active: false,
          role_permissions: [{ permissions: { code: 'audit.read' } }],
        },
      },
    ]);
    const prisma = { user_roles: { findMany } } as unknown as PrismaService;
    const repository = new PrismaUserAuthorizationRepository(prisma);

    await expect(repository.getPermissions('user-id')).resolves.toEqual([
      'users.read',
      'inventory.read',
      'users.update',
    ]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
