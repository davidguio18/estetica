import 'reflect-metadata';
import {
  REQUIRED_PERMISSIONS,
  RequirePermissions,
} from '../../src/modules/auth/presentation/security/required-permissions.decorator';

describe('RequirePermissions', () => {
  it('stores required permissions as metadata', () => {
    class TestController {
      @RequirePermissions('users.read', 'users.update')
      handler(): void {
        return undefined;
      }
    }

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS, TestController.prototype.handler)).toEqual([
      'users.read',
      'users.update',
    ]);
  });
});
