import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CoreModule } from './modules/core/core.module'; // absorbs departments + notifications too now
import { LocationsModule } from './modules/assets/locations/locations.module';
import { CategoriesModule } from './modules/assets/categories/categories.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AttachmentsModule } from './modules/assets/attachments/attachments.module';
import { MaintenanceModule } from './modules/assets/maintenance/maintenance.module';
import { SchedulerModule } from './modules/assets/scheduler/scheduler.module';
import { MovementsModule } from './modules/assets/movements/movements.module';
import { AuditsModule } from './modules/assets/audits/audits.module';
import { ReportsModule } from './modules/assets/reports/reports.module';
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module';
import { PayrollModule } from './modules/payroll/payroll.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CoreModule,
    LocationsModule,
    CategoriesModule,
    AssetsModule,
    AttachmentsModule,
    MaintenanceModule,
    SchedulerModule,
    MovementsModule,
    AuditsModule,
    ReportsModule,
    HelpdeskModule,
    PayrollModule,
  ],
})
export class AppModule {}

