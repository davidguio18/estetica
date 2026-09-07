import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { RefreshTokenError } from '../../src/modules/auth/application/errors/refresh-token.error';
import { PrismaRefreshTokenService } from '../../src/modules/auth/infrastructure/prisma-refresh-token.service';

type RefreshTransaction = {
  refresh_tokens: {
    findUnique: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  $queryRaw: jest.Mock;
};

const createConfig = (): ConfigService =>
  ({
    getOrThrow: jest.fn(() => '7d'),
  }) as unknown as ConfigService;

const createPrisma = (transaction: RefreshTransaction): PrismaService =>
  ({
    refresh_tokens: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-id' }]),
    $transaction: jest.fn((callback: (tx: RefreshTransaction) => Promise<unknown>) =>
      callback(transaction),
    ),
  }) as unknown as PrismaService;

describe('PrismaRefreshTokenService', () => {
  it('stores only a hash and rotates a valid refresh token', async () => {
    const transaction: RefreshTransaction = {
      refresh_tokens: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'current-id',
          user_id: 'user-id',
          token_hash: 'stored-hash',
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: null,
          users: { is_active: true },
        }),
        create: jest.fn().mockResolvedValue({ id: 'replacement-id' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-id' }]),
    };
    const prisma = createPrisma(transaction);
    const service = new PrismaRefreshTokenService(prisma, createConfig());

    const issued = await service.issue('user-id');
    expect(issued.refreshToken).not.toBe(
      (prisma.refresh_tokens.create as jest.Mock).mock.calls[0][0].data.token_hash,
    );

    const rotated = await service.rotate('old-refresh-token');
    expect(rotated.userId).toBe('user-id');
    expect(rotated.refreshToken).not.toBe('old-refresh-token');
    expect(transaction.refresh_tokens.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'current-id', revoked_at: null },
        data: expect.objectContaining({ replaced_by_token_id: 'replacement-id' }),
      }),
    );
  });

  it('revokes active tokens and rejects reuse of a revoked token', async () => {
    const transaction: RefreshTransaction = {
      refresh_tokens: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'revoked-id',
          user_id: 'user-id',
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: new Date(),
          users: { is_active: true },
        }),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-id' }]),
    };
    const service = new PrismaRefreshTokenService(createPrisma(transaction), createConfig());

    await expect(service.rotate('reused-token')).rejects.toEqual(new RefreshTokenError());
    expect(transaction.refresh_tokens.updateMany).toHaveBeenCalledWith({
      where: { user_id: 'user-id', revoked_at: null },
      data: expect.objectContaining({ revoked_at: expect.any(Date) }),
    });
    expect(transaction.refresh_tokens.create).not.toHaveBeenCalled();
  });

  it('rejects an expired refresh token without issuing a replacement', async () => {
    const transaction: RefreshTransaction = {
      refresh_tokens: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'expired-id',
          user_id: 'user-id',
          expires_at: new Date(Date.now() - 60_000),
          revoked_at: null,
          users: { is_active: true },
        }),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-id' }]),
    };
    const service = new PrismaRefreshTokenService(createPrisma(transaction), createConfig());

    await expect(service.rotate('expired-token')).rejects.toEqual(new RefreshTokenError());
    expect(transaction.refresh_tokens.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive user before creating a replacement token', async () => {
    const transaction: RefreshTransaction = {
      refresh_tokens: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'inactive-token-id',
          user_id: 'inactive-user-id',
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: null,
          users: { is_active: false },
        }),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'inactive-user-id' }]),
    };
    const service = new PrismaRefreshTokenService(createPrisma(transaction), createConfig());

    await expect(service.rotate('inactive-user-token')).rejects.toEqual(new RefreshTokenError());
    expect(transaction.refresh_tokens.create).not.toHaveBeenCalled();
  });

  it('rejects a refresh token that does not exist', async () => {
    const transaction: RefreshTransaction = {
      refresh_tokens: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-id' }]),
    };
    const service = new PrismaRefreshTokenService(createPrisma(transaction), createConfig());

    await expect(service.rotate('unknown-token')).rejects.toEqual(new RefreshTokenError());
    expect(transaction.refresh_tokens.updateMany).not.toHaveBeenCalled();
  });

  it('allows only one of two concurrent rotations to consume the same token', async () => {
    let transactionTail = Promise.resolve();
    let revoked = false;
    const transaction: RefreshTransaction = {
      refresh_tokens: {
        findUnique: jest.fn().mockImplementation(async () => ({
          id: 'current-id',
          user_id: 'user-id',
          expires_at: new Date(Date.now() + 60_000),
          revoked_at: revoked ? new Date() : null,
          users: { is_active: true },
        })),
        create: jest.fn().mockResolvedValue({ id: 'replacement-id' }),
        updateMany: jest.fn().mockImplementation(async ({ where }: { where: { id?: string } }) => {
          if (where.id && !revoked) {
            revoked = true;
            return { count: 1 };
          }
          return { count: 1 };
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-id' }]),
    };
    const prisma = {
      refresh_tokens: { create: jest.fn() },
      $transaction: jest.fn((callback: (tx: RefreshTransaction) => Promise<unknown>) => {
        const execution = transactionTail.then(() => callback(transaction));
        transactionTail = execution.then(
          () => undefined,
          () => undefined,
        );
        return execution;
      }),
    } as unknown as PrismaService;
    const service = new PrismaRefreshTokenService(prisma, createConfig());

    const results = await Promise.allSettled([
      service.rotate('same-token'),
      service.rotate('same-token'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(transaction.refresh_tokens.create).toHaveBeenCalledTimes(1);
  });
});
