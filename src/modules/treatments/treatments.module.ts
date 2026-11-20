import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../shared/database/database.module';
import { TREATMENT_REPOSITORY } from './application/ports/treatment.repository.port';
import { TreatmentsUseCase } from './application/treatments.use-case';
import { PrismaTreatmentRepository } from './infrastructure/prisma-treatment.repository';
import { TreatmentsController } from './presentation/treatments.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [TreatmentsController],
  providers: [
    TreatmentsUseCase,
    { provide: TREATMENT_REPOSITORY, useClass: PrismaTreatmentRepository },
  ],
})
export class TreatmentsModule {}
