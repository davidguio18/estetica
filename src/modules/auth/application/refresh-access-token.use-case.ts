import { Inject, Injectable } from '@nestjs/common';
import { InvalidCredentialsError } from './errors/invalid-credentials.error';
import { ACCESS_TOKEN_SIGNER, AccessTokenSigner } from './ports/access-token-signer.port';
import { REFRESH_TOKEN_SERVICE, RefreshTokenService } from './ports/refresh-token.service.port';
import { USER_REPOSITORY, UserRepository } from './ports/user-repository.port';

export interface RefreshAccessTokenInput {
  refreshToken: string;
}

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: RefreshTokenService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(ACCESS_TOKEN_SIGNER) private readonly accessTokenSigner: AccessTokenSigner,
  ) {}

  async execute(input: RefreshAccessTokenInput) {
    const rotated = await this.refreshTokenService.rotate(input.refreshToken);
    const user = await this.userRepository.findById(rotated.userId);

    if (!user || !user.isActive || !user.id) {
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.accessTokenSigner.sign(user);
    return {
      accessToken: accessToken.accessToken,
      refreshToken: rotated.refreshToken,
      expiresIn: accessToken.expiresIn,
    };
  }
}
