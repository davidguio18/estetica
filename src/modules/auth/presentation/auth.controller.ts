import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '../application/create-user.use-case';
import { User } from '../domain/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthDomainExceptionFilter } from './filters/auth-domain-exception.filter';

@ApiTags('auth')
@Controller('auth')
@UseFilters(AuthDomainExceptionFilter)
export class AuthController {
    
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post('users')
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ description: 'User created without sensitive credentials' })
  async createUser(@Body() dto: CreateUserDto): Promise<ReturnType<User['toPublicData']>> {
    const user = await this.createUserUseCase.execute(dto);
    return user.toPublicData();
  }
}
