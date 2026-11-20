import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { movement_type } from '@prisma/client';

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  active?: boolean;
  @IsOptional() @IsString() search?: string;
}
export class CreateCategoryDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class CreateSupplierDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
}
export class UpdateSupplierDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class CreateProductDto {
  @IsUUID() categoryId!: string;
  @IsString() @MinLength(1) sku!: string;
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() unitOfMeasure?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumStock?: number;
}
export class UpdateProductDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() @MinLength(1) sku?: string;
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() unitOfMeasure?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumStock?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class ProductQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID() categoryId?: string;
}
export class CreateBatchDto {
  @IsUUID() productId!: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsString() @MinLength(1) batchNumber!: string;
  @IsOptional() @IsDateString() manufacturingDate?: string;
  @IsDateString() expirationDate!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) purchasePrice?: number;
  @Type(() => Number) @IsNumber() @Min(0.01) initialQuantity!: number;
}
export class CreateMovementDto {
  @IsUUID() batchId!: string;
  @ApiProperty({ enum: movement_type }) @IsEnum(movement_type) movementType!: movement_type;
  @Type(() => Number) @IsNumber() @Min(0.01) quantity!: number;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}
