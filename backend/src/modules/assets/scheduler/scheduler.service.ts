import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../../core/notifications/notifications.service';

@Injectable()
export class SchedulerService {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMaintenanceCheck() {
    await this.notificationsService.checkUpcomingMaintenance();
  }
}
