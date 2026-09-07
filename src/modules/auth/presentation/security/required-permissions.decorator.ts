import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS = 'auth:required-permissions';

export const RequirePermissions = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
