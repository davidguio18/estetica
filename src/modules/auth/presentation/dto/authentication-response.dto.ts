import { ApiProperty } from '@nestjs/swagger';

export class AuthenticationResponseDto {
  @ApiProperty({ description: 'Short-lived access JWT' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque refresh token' })
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn!: number;
}
