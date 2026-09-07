import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { UserAuthorizationPort } from '../application/ports/user-authorization.port';

@Injectable()
export class PrismaUserAuthorizationRepository implements UserAuthorizationPort {
  constructor(private readonly prisma: PrismaService) {}

  async getPermissions(userId: string): Promise<string[]> {
    const assignments = await this.prisma.user_roles.findMany({
      where: { user_id: userId },
      select: {
        roles: {
          select: {
            is_active: true,
            role_permissions: {
              select: {
                permissions: {
                  select: { code: true },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const assignment of assignments) {
      if (!assignment.roles.is_active) {
        continue;
      }
      for (const rolePermission of assignment.roles.role_permissions) {
        permissions.add(rolePermission.permissions.code);
      }
    }

    return [...permissions];
  }
}
