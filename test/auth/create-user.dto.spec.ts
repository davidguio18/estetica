import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from '../../src/modules/auth/presentation/dto/create-user.dto';

describe('CreateUserDto', () => {
  it('accepts valid input and normalizes username and email', async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: ' New.User ',
      email: 'USER@EXAMPLE.COM ',
      password: 'StrongPassword1',
      firstName: ' First ',
      lastName: ' Last ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.username).toBe('new.user');
    expect(dto.email).toBe('user@example.com');
    expect(dto.firstName).toBe('First');
    expect(dto.lastName).toBe('Last');
  });

  it('rejects invalid email and short password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      username: 'valid-user',
      email: 'not-an-email',
      password: 'short',
      firstName: 'First',
      lastName: 'Last',
    });

    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(expect.arrayContaining(['email', 'password']));
  });
});
