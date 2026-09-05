import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserUseCase } from '../../src/modules/auth/application/create-user.use-case';
import { DuplicateUserError } from '../../src/modules/auth/application/errors/duplicate-user.error';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../src/modules/auth/application/ports/password-hasher.port';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../src/modules/auth/application/ports/user-repository.port';
import { User } from '../../src/modules/auth/domain/user.entity';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let repository: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;

  beforeEach(async () => {
    repository = {
      existsByUsername: jest.fn().mockResolvedValue(false),
      existsByEmail: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation(async (user: User) => user),
    };
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('argon2id-hash'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserUseCase,
        { provide: USER_REPOSITORY, useValue: repository },
        { provide: PASSWORD_HASHER, useValue: passwordHasher },
      ],
    }).compile();

    useCase = module.get(CreateUserUseCase);
  });

  it('creates a user and never persists the plaintext password', async () => {
    const user = await useCase.execute({
      username: ' DraCharlin ',
      email: 'DOCTOR@EXAMPLE.COM ',
      password: 'StrongPassword1',
      firstName: 'Dra.',
      lastName: 'Charlin',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('StrongPassword1');
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(user.toPublicData()).not.toHaveProperty('passwordHash');
    expect(repository.create.mock.calls[0][0].toData().passwordHash).toBe('argon2id-hash');
    expect(repository.create.mock.calls[0][0].toData().passwordHash).not.toBe('StrongPassword1');
  });

  it('rejects a duplicated username before hashing the password', async () => {
    repository.existsByUsername.mockResolvedValue(true);

    await expect(
      useCase.execute({
        username: 'existing',
        email: 'new@example.com',
        password: 'StrongPassword1',
        firstName: 'First',
        lastName: 'Last',
      }),
    ).rejects.toEqual(new DuplicateUserError('username'));

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicated email before hashing the password', async () => {
    repository.existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute({
        username: 'new-user',
        email: 'existing@example.com',
        password: 'StrongPassword1',
        firstName: 'First',
        lastName: 'Last',
      }),
    ).rejects.toEqual(new DuplicateUserError('email'));

    expect(passwordHasher.hash).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
