import { Body, Controller, Get, Post, Req, UseFilters, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshAccessTokenUseCase } from '../application/refresh-access-token.use-case';
import { User } from '../domain/user.entity';
import { AuthenticationResponseDto } from './dto/authentication-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthDomainExceptionFilter } from './filters/auth-domain-exception.filter';
import { AuthenticatedUser } from './security/authenticated-user';
import { JwtAuthenticationGuard } from './security/jwt-authentication.guard';
import { PermissionsGuard } from './security/permissions.guard';
import { RequirePermissions } from './security/required-permissions.decorator';

@ApiTags('auth')
@Controller('auth')
@UseFilters(AuthDomainExceptionFilter)
export class AuthController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
  ) {}

  @Post('users')
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'User created without sensitive credentials' })
  async createUser(@Body() dto: CreateUserDto): Promise<ReturnType<User['toPublicData']>> {
    const user = await this.createUserUseCase.execute(dto);
    return user.toPublicData();
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiOkResponse({ type: AuthenticationResponseDto })
  async login(@Body() dto: LoginDto): Promise<AuthenticationResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiOkResponse({ type: AuthenticationResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthenticationResponseDto> {
    return this.refreshAccessTokenUseCase.execute(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user principal' })
  @ApiOkResponse({ description: 'Public authenticated user identity' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @UseGuards(JwtAuthenticationGuard)
  me(@Req() request: RequestWithUser): AuthenticatedUser {
    return request.user;
  }

  @Get('rbac-check')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify permission-based authorization' })
  @ApiOkResponse({ description: 'User has the required permission' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @ApiForbiddenResponse({ description: 'User lacks the required permission' })
  @UseGuards(JwtAuthenticationGuard, PermissionsGuard)
  @RequirePermissions('users.read')
  rbacCheck(): { authorized: boolean } {
    return { authorized: true };
  }
}

type RequestWithUser = Request & { user: AuthenticatedUser };
