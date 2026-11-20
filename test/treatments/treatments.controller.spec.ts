import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { REQUIRED_PERMISSIONS } from '../../src/modules/auth/presentation/security/required-permissions.decorator';
import { TreatmentsController } from '../../src/modules/treatments/presentation/treatments.controller';

describe('TreatmentsController security declarations', () => {
  it.each([
    ['create', ['treatments.create']],
    ['list', ['treatments.read']],
    ['find', ['treatments.read']],
    ['update', ['treatments.update']],
    ['deactivate', ['treatments.delete']],
  ] as const)('%s requires its treatment permission', (method, permissions) => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS, TreatmentsController.prototype[method]),
    ).toEqual(permissions);
  });

  it('rejects an invalid UUID with the pipe used by treatment routes', async () => {
    const pipe = new ParseUUIDPipe({ version: '4' });
    await expect(pipe.transform('invalid-id', { type: 'param' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
