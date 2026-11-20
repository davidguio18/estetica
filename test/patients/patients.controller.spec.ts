import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { REQUIRED_PERMISSIONS } from '../../src/modules/auth/presentation/security/required-permissions.decorator';
import { PatientsController } from '../../src/modules/patients/presentation/patients.controller';

describe('PatientsController security declarations', () => {
  it.each([
    ['create', ['patients.create']],
    ['list', ['patients.read']],
    ['find', ['patients.read']],
    ['update', ['patients.update']],
    ['deactivate', ['patients.delete']],
  ] as const)('%s requires its patient permission', (method, permissions) => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS, PatientsController.prototype[method])).toEqual(
      permissions,
    );
  });

  it('rejects an invalid UUID with the pipe used by patient routes', async () => {
    const pipe = new ParseUUIDPipe({ version: '4' });
    await expect(pipe.transform('invalid-id', { type: 'param' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
