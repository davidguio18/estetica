import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { USER_REPOSITORY, UserRepository } from '../../application/ports/user-repository.port';
import { AuthenticatedUser } from './authenticated-user';

interface AccessTokenPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Injectable()
export class JwtAuthenticationGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        algorithms: ['HS256'],
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException();
    }

    if (
      !this.isValidPayload(payload) ||
      !this.isUuid(payload.sub) ||
      payload.username.length === 0
    ) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive || !user.id) {
      throw new UnauthorizedException();
    }

    request.user = { id: user.id, username: user.username };
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.header('authorization');
    if (!authorization) {
      return null;
    }

    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    return match?.[1] ?? null;
  }

  private isValidPayload(payload: Partial<AccessTokenPayload>): payload is AccessTokenPayload {
    return (
      typeof payload.sub === 'string' &&
      typeof payload.username === 'string' &&
      typeof payload.iat === 'number' &&
      typeof payload.exp === 'number'
    );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
