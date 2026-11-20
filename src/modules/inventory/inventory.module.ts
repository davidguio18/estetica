import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../shared/database/database.module';
import { INVENTORY_REPOSITORY } from './application/ports/inventory.repository.port';
import { InventoryUseCase } from './application/inventory.use-case';
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository';
import { InventoryController } from './presentation/inventory.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [InventoryController],
  providers: [
    InventoryUseCase,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
  ],
})
export class InventoryModule {}
