import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { document_type, gender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class PatientTextDto {
  @IsString() @MinLength(1) documentNumber!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsOptional() @IsString() secondLastName?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() emergencyContactRelationship?: string;
}
export class CreatePatientDto extends PatientTextDto {
  @ApiProperty({ enum: document_type }) @IsEnum(document_type) documentType!: document_type;
  @ApiProperty({ enum: gender }) @IsEnum(gender) gender!: gender;
}
export class UpdatePatientDto {
  @IsOptional()
  @ApiPropertyOptional({ enum: document_type })
  @IsEnum(document_type)
  documentType?: document_type;
  @IsOptional() @IsString() @MinLength(1) documentNumber?: string;
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @IsOptional() @IsString() secondLastName?: string;
  @IsOptional() @ApiPropertyOptional({ enum: gender }) @IsEnum(gender) gender?: gender;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() emergencyContactRelationship?: string;
}
export class ListPatientsDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
}
export class PatientResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: document_type }) documentType!: document_type;
  @ApiProperty() documentNumber!: string;
  @ApiProperty() firstName!: string;
  @ApiPropertyOptional() middleName!: string | null;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() secondLastName!: string | null;
  @ApiProperty({ enum: gender }) gender!: gender;
  @ApiPropertyOptional() birthDate!: Date | null;
  @ApiPropertyOptional() phone!: string | null;
  @ApiPropertyOptional() email!: string | null;
  @ApiPropertyOptional() address!: string | null;
  @ApiPropertyOptional() city!: string | null;
  @ApiPropertyOptional() emergencyContactName!: string | null;
  @ApiPropertyOptional() emergencyContactPhone!: string | null;
  @ApiPropertyOptional() emergencyContactRelationship!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
