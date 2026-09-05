import { Inject, Injectable } from '@nestjs/common';
import { DuplicateUserError } from './errors/duplicate-user.error';
import { PASSWORD_HASHER, PasswordHasher } from './ports/password-hasher.port';
import { USER_REPOSITORY, UserRepository } from './ports/user-repository.port';
import { InvalidUserError, User } from '../domain/user.entity';

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class CreateUserUseCase {
    
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    if (input.password.length < 8 || input.password.length > 128) {
      throw new InvalidUserError('Password format is invalid');
    }

    const username = input.username.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();

    if (await this.userRepository.existsByUsername(username)) {
      throw new DuplicateUserError('username');
    }
    if (await this.userRepository.existsByEmail(email)) {
      throw new DuplicateUserError('email');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = User.create({
      username,
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    return this.userRepository.create(user);
  }
}
