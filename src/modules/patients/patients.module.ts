import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../shared/database/database.module';
import { PatientsUseCase } from './application/patients.use-case';
import { PATIENT_REPOSITORY } from './application/ports/patient.repository.port';
import { PrismaPatientRepository } from './infrastructure/prisma-patient.repository';
import { PatientsController } from './presentation/patients.controller';
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PatientsController],
  providers: [PatientsUseCase, { provide: PATIENT_REPOSITORY, useClass: PrismaPatientRepository }],
})
export class PatientsModule {}
