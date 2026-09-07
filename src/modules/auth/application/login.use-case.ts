import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from './errors/invalid-credentials.error';
import { ACCESS_TOKEN_SIGNER, AccessTokenSigner } from './ports/access-token-signer.port';
import { PASSWORD_HASHER, PasswordHasher } from './ports/password-hasher.port';
import { REFRESH_TOKEN_SERVICE, RefreshTokenService } from './ports/refresh-token.service.port';
import { USER_REPOSITORY, UserRepository } from './ports/user-repository.port';

const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXktc2FsdA$ZHVtbXktcGFzc3dvcmQ';

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthenticationResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_SIGNER) private readonly accessTokenSigner: AccessTokenSigner,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async execute(input: LoginInput): Promise<AuthenticationResult> {
    const username = input.username.trim().toLowerCase();
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      await this.passwordHasher.verify(DUMMY_PASSWORD_HASH, input.password);
      throw new InvalidCredentialsError();
    }

    const now = new Date();
    if (!user.isActive || (user.lockedUntil && user.lockedUntil > now)) {
      await this.passwordHasher.verify(user.passwordHash, input.password);
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(user.passwordHash, input.password);
    if (!passwordMatches) {
      await this.userRepository.recordFailedLogin(user);
      throw new InvalidCredentialsError();
    }

    const authenticatedUser = await this.userRepository.recordSuccessfulLogin(user, now);
    if (!authenticatedUser.id) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.accessTokenSigner.sign(authenticatedUser);
    const refreshToken = await this.refreshTokenService.issue(authenticatedUser.id);

    return {
      accessToken: accessToken.accessToken,
      refreshToken: refreshToken.refreshToken,
      expiresIn: accessToken.expiresIn,
    };
  }
}
