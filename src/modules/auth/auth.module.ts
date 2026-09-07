import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CreateUserUseCase } from './application/create-user.use-case';
import { LoginUseCase } from './application/login.use-case';
import { RefreshAccessTokenUseCase } from './application/refresh-access-token.use-case';
import { ACCESS_TOKEN_SIGNER } from './application/ports/access-token-signer.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { REFRESH_TOKEN_SERVICE } from './application/ports/refresh-token.service.port';
import { USER_REPOSITORY } from './application/ports/user-repository.port';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtAccessTokenSigner } from './infrastructure/jwt-access-token.signer';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { PrismaRefreshTokenService } from './infrastructure/prisma-refresh-token.service';
import { PrismaUserAuthorizationRepository } from './infrastructure/prisma-user-authorization.repository';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthenticationGuard } from './presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from './presentation/security/permissions.guard';
import { USER_AUTHORIZATION } from './application/ports/user-authorization.port';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    CreateUserUseCase,
    LoginUseCase,
    RefreshAccessTokenUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: ACCESS_TOKEN_SIGNER,
      useClass: JwtAccessTokenSigner,
    },
    {
      provide: REFRESH_TOKEN_SERVICE,
      useClass: PrismaRefreshTokenService,
    },
    {
      provide: USER_AUTHORIZATION,
      useClass: PrismaUserAuthorizationRepository,
    },
    JwtAuthenticationGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
