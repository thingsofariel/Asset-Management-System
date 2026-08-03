import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // enables @Cron jobs used later by the Maintenance module
    PrismaModule,
    AuthModule,
    UsersModule,
    // AssetsModule, MovementsModule, MaintenanceModule, AuditsModule,
    // NotificationsModule, ReportsModule, QrModule — added in Phases 1–5
  ],
})
export class AppModule {}
