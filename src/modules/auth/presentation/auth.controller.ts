import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RefreshAccessTokenUseCase } from '../application/refresh-access-token.use-case';
import { User } from '../domain/user.entity';
import { AuthenticationResponseDto } from './dto/authentication-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthDomainExceptionFilter } from './filters/auth-domain-exception.filter';

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
}
