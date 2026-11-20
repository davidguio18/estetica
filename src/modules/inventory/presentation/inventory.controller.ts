import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { InventoryUseCase } from '../application/inventory.use-case';
import { JwtAuthenticationGuard } from '../../auth/presentation/security/jwt-authentication.guard';
import { PermissionsGuard } from '../../auth/presentation/security/permissions.guard';
import { RequirePermissions } from '../../auth/presentation/security/required-permissions.decorator';
import { AuthenticatedUser } from '../../auth/presentation/security/authenticated-user';
import {
  CreateBatchDto,
  CreateCategoryDto,
  CreateMovementDto,
  CreateProductDto,
  CreateSupplierDto,
  PageQueryDto,
  ProductQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateSupplierDto,
} from './dto/inventory.dto';
import { InventoryExceptionFilter } from './filters/inventory-exception.filter';

type RequestWithUser = Request & { user: AuthenticatedUser };
@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthenticationGuard, PermissionsGuard)
@UseFilters(InventoryExceptionFilter)
export class InventoryController {
  constructor(private readonly inventory: InventoryUseCase) {}
  @Post('categories') @RequirePermissions('products.create') @ApiCreatedResponse() createCategory(
    @Body() dto: CreateCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.createCategory(dto, req.user.id);
  }
  @Get('categories') @RequirePermissions('products.read') @ApiOkResponse() listCategories(
    @Query() query: PageQueryDto,
  ) {
    return this.inventory.listCategories(query);
  }
  @Get('categories/:id') @RequirePermissions('products.read') category(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.inventory.findCategory(id);
  }
  @Patch('categories/:id') @RequirePermissions('products.update') updateCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.updateCategory(id, dto, req.user.id);
  }
  @Delete('categories/:id')
  @RequirePermissions('products.update')
  @HttpCode(200)
  deactivateCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.deactivateCategory(id, req.user.id);
  }
  @Post('suppliers') @RequirePermissions('suppliers.create') createSupplier(
    @Body() dto: CreateSupplierDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.createSupplier(dto, req.user.id);
  }
  @Get('suppliers') @RequirePermissions('suppliers.read') listSuppliers(
    @Query() query: PageQueryDto,
  ) {
    return this.inventory.listSuppliers(query);
  }
  @Get('suppliers/:id') @RequirePermissions('suppliers.read') supplier(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.inventory.findSupplier(id);
  }
  @Patch('suppliers/:id') @RequirePermissions('suppliers.update') updateSupplier(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateSupplierDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.updateSupplier(id, dto, req.user.id);
  }
  @Delete('suppliers/:id')
  @RequirePermissions('suppliers.update')
  @HttpCode(200)
  deactivateSupplier(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.deactivateSupplier(id, req.user.id);
  }
  @Post('products') @RequirePermissions('products.create') createProduct(
    @Body() dto: CreateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.createProduct(dto, req.user.id);
  }
  @Get('products') @RequirePermissions('products.read') listProducts(
    @Query() query: ProductQueryDto,
  ) {
    return this.inventory.listProducts(query);
  }
  @Get('products/:id') @RequirePermissions('products.read') product(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.inventory.findProduct(id);
  }
  @Patch('products/:id') @RequirePermissions('products.update') updateProduct(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.updateProduct(id, dto, req.user.id);
  }
  @Get('products/:id/stock') @RequirePermissions('inventory.read') stock(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.inventory.productStock(id);
  }
  @Post('batches') @RequirePermissions('inventory.create') createBatch(
    @Body() dto: CreateBatchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.createBatch({
      ...dto,
      manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : undefined,
      expirationDate: new Date(dto.expirationDate),
      performedBy: req.user.id,
    });
  }
  @Get('products/:id/batches') @RequirePermissions('inventory.read') batches(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.inventory.listBatches(id);
  }
  @Post('movements') @RequirePermissions('inventory.adjust') createMovement(
    @Body() dto: CreateMovementDto,
    @Req() req: RequestWithUser,
  ) {
    return this.inventory.registerMovement({ ...dto, performedBy: req.user.id });
  }
}
