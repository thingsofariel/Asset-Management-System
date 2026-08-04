import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocationsModule } from './locations/locations.module';
import { DepartmentsModule } from './departments/departments.module';
import { CategoriesModule } from './categories/categories.module';
import { AssetsModule } from './assets/assets.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { MovementsModule } from './movements/movements.module';
import { AuditsModule } from './audits/audits.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    DepartmentsModule,
    CategoriesModule,
    AssetsModule,
    AttachmentsModule,
    MaintenanceModule,
    NotificationsModule,
    SchedulerModule,
    MovementsModule,
    AuditsModule,
    ReportsModule,
  ],
})
export class AppModule {}
