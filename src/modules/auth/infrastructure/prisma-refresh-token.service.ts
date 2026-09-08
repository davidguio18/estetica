import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RefreshTokenError } from '../application/errors/refresh-token.error';
import {
  RefreshTokenResult,
  RefreshTokenService,
} from '../application/ports/refresh-token.service.port';
import { parseDurationSeconds } from './token-duration';
import { AUDIT_LOGGER, AuditLogger } from '../../../shared/ports/audit-logger.port';

@Injectable()
export class PrismaRefreshTokenService implements RefreshTokenService {
  private readonly expiresIn: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
    @Inject(AUDIT_LOGGER) private readonly auditLogger: AuditLogger,
  ) {
    this.expiresIn = parseDurationSeconds(
      configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_IN'),
    );
  }

  async issue(userId: string): Promise<RefreshTokenResult> {
    const refreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + this.expiresIn * 1000);

    await this.prisma.refresh_tokens.create({
      data: {
        user_id: userId,
        token_hash: this.hashToken(refreshToken),
        expires_at: expiresAt,
      },
    });

    return { refreshToken, expiresIn: this.expiresIn };
  }

  async rotate(refreshToken: string): Promise<RefreshTokenResult & { userId: string }> {
    if (!refreshToken) {
      throw new RefreshTokenError();
    }

    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();
    const nextRefreshToken = this.generateToken();
    const nextTokenHash = this.hashToken(nextRefreshToken);
    const nextExpiresAt = new Date(now.getTime() + this.expiresIn * 1000);

    const result = await this.prisma.$transaction(async (transaction) => {
      let currentToken = await transaction.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
        include: { users: true },
      });

      if (!currentToken) {
        throw new RefreshTokenError();
      }

      const activeUsers = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "auth"."users"
        WHERE "id" = ${currentToken.user_id}::uuid
        FOR UPDATE
      `;

      if (activeUsers.length === 0) {
        throw new RefreshTokenError();
      }

      currentToken = await transaction.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
        include: { users: true },
      });

      if (!currentToken) {
        throw new RefreshTokenError();
      }

      if (currentToken.revoked_at) {
        await transaction.refresh_tokens.updateMany({
          where: { user_id: currentToken.user_id, revoked_at: null },
          data: { revoked_at: now },
        });
        return { reused: true as const, userId: currentToken.user_id };
      }

      if (!currentToken.users.is_active) {
        throw new RefreshTokenError();
      }

      if (currentToken.expires_at <= now) {
        throw new RefreshTokenError();
      }

      const replacement = await transaction.refresh_tokens.create({
        data: {
          user_id: currentToken.user_id,
          token_hash: nextTokenHash,
          expires_at: nextExpiresAt,
        },
      });
      const revoked = await transaction.refresh_tokens.updateMany({
        where: { id: currentToken.id, revoked_at: null },
        data: {
          revoked_at: now,
          replaced_by_token_id: replacement.id,
        },
      });

      if (revoked.count !== 1) {
        throw new RefreshTokenError();
      }

      return {
        reused: false as const,
        userId: currentToken.user_id,
        refreshToken: nextRefreshToken,
        expiresIn: this.expiresIn,
      };
    });

    if (result.reused) {
      await this.auditLogger.record({
        userId: result.userId,
        action: 'REFRESH_TOKEN_REUSED',
        entityType: 'USER',
        entityId: result.userId,
      });
      throw new RefreshTokenError();
    }

    return result;
  }

  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }
}
