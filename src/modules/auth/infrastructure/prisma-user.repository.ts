import { Injectable } from '@nestjs/common';
import { Prisma, users as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { DuplicateUserError } from '../application/errors/duplicate-user.error';
import { UserRepository } from '../application/ports/user-repository.port';
import { User, UserData } from '../domain/user.entity';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByUsername(username: string): Promise<boolean> {
    const user = await this.prisma.users.findUnique({
      where: { username },
      select: { id: true },
    });
    return user !== null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  }

  async create(user: User): Promise<User> {
    const data = user.toData();

    try {
      const persistedUser = await this.prisma.users.create({
        data: {
          username: data.username,
          email: data.email,
          password_hash: data.passwordHash,
          first_name: data.firstName,
          last_name: data.lastName,
          password_changed_at: data.passwordChangedAt,
        },
      });
      return User.restore(this.toDomainData(persistedUser));
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateUserError(this.getDuplicateField(error));
      }
      throw error;
    }
  }

  private toDomainData(user: PrismaUser): UserData {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      passwordChangedAt: user.password_changed_at ?? user.created_at,
      lastLoginAt: user.last_login_at ?? undefined,
      failedLoginAttempts: user.failed_login_attempts,
      lockedUntil: user.locked_until ?? undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  private getDuplicateField(error: Prisma.PrismaClientKnownRequestError): 'username' | 'email' {
    const target = error.meta?.target;
    if (typeof target === 'string' && target.includes('email')) {
      return 'email';
    }
    if (Array.isArray(target) && target.includes('email')) {
      return 'email';
    }
    return 'username';
  }
}
