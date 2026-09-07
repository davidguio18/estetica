import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenResult,
  AccessTokenSigner,
} from '../application/ports/access-token-signer.port';
import { User } from '../domain/user.entity';
import { parseDurationSeconds } from './token-duration';

@Injectable()
export class JwtAccessTokenSigner implements AccessTokenSigner {
  private readonly secret: string;
  private readonly expiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.secret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.expiresIn = parseDurationSeconds(
      configService.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    );
  }

  async sign(user: User): Promise<AccessTokenResult> {
    if (!user.id) {
      throw new Error('Cannot issue an access token without a user ID');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
      },
      {
        secret: this.secret,
        expiresIn: this.expiresIn,
      },
    );

    return { accessToken, expiresIn: this.expiresIn };
  }
}
