import { Module } from '@nestjs/common';
import { CreateUserUseCase } from './application/create-user.use-case';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { USER_REPOSITORY } from './application/ports/user-repository.port';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    CreateUserUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
  ],
})
export class AuthModule {}
