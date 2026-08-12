import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { NotificationsModule } from '../../core/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
