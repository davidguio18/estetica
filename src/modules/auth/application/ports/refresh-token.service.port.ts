export const REFRESH_TOKEN_SERVICE = Symbol('REFRESH_TOKEN_SERVICE');

export interface RefreshTokenResult {
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenService {
  issue(userId: string): Promise<RefreshTokenResult>;
  rotate(refreshToken: string): Promise<RefreshTokenResult & { userId: string }>;
}
