import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  USER_AUTHORIZATION,
  UserAuthorizationPort,
} from '../../application/ports/user-authorization.port';
import { AuthenticatedUser } from './authenticated-user';
import { REQUIRED_PERMISSIONS } from './required-permissions.decorator';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_AUTHORIZATION) private readonly authorization: UserAuthorizationPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const permissions = await this.authorization.getPermissions(request.user.id);
    const isAuthorized = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
    if (!isAuthorized) {
      throw new ForbiddenException();
    }

    return true;
  }
}
