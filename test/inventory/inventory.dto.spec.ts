import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PageQueryDto } from '../../src/modules/inventory/presentation/dto/inventory.dto';

describe('PageQueryDto', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('parses active=%s as %s', async (active, expected) => {
    const dto = plainToInstance(PageQueryDto, { active });
    expect(dto.active).toBe(expected);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects values other than true and false for active', async () => {
    const dto = plainToInstance(PageQueryDto, { active: 'not-a-boolean' });
    await expect(validate(dto)).resolves.toHaveLength(1);
  });
});
