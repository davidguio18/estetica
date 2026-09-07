import { User } from '../../domain/user.entity';

export const ACCESS_TOKEN_SIGNER = Symbol('ACCESS_TOKEN_SIGNER');

export interface AccessTokenResult {
  accessToken: string;
  expiresIn: number;
}

export interface AccessTokenSigner {
  sign(user: User): Promise<AccessTokenResult>;
}
