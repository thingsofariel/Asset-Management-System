import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // relatedAssetId/relatedRequestId/relatedPayslipId are plain scalar
  // fields on Notification, not Prisma relations — core doesn't import
  // the assets/helpdesk/payroll models, so there's nothing to `include`.
  // This does one batch lookup for whichever assets are referenced,
  // instead of a relational include, to keep that decoupling.
  async findAll() {
    const notifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const assetIds = [...new Set(notifications.map((n) => n.relatedAssetId).filter((id): id is string => !!id))];

    const assets = assetIds.length
      ? await this.prisma.asset.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, name: true, assetCode: true },
        })
      : [];
    const assetById = new Map(assets.map((a) => [a.id, a]));

    return notifications.map((n) => ({
      ...n,
      relatedAsset: n.relatedAssetId ? assetById.get(n.relatedAssetId) ?? null : null,
    }));
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
    return { success: true };
  }

  /**
   * Finds active maintenance schedules due in exactly 7 or 3 days and creates a
   * notification for each — skipping ones already notified today, so this is
   * safe to call repeatedly (both from the daily cron and a manual trigger).
   */
  async checkUpcomingMaintenance() {
    const schedules = await this.prisma.maintenanceSchedule.findMany({
      where: { isActive: true },
      include: { asset: { select: { id: true, name: true, assetCode: true } } },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = new Date(today);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    let created = 0;

    for (const schedule of schedules) {
      const dueDate = new Date(schedule.nextDueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

      if (daysUntilDue !== 7 && daysUntilDue !== 3) continue;

      const title = `Maintenance due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}: ${schedule.asset.name}`;

      const alreadyNotified = await this.prisma.notification.findFirst({
        where: {
          relatedAssetId: schedule.assetId,
          title,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      });
      if (alreadyNotified) continue;

      await this.prisma.notification.create({
        data: {
          title,
          message: `${schedule.asset.assetCode} — scheduled maintenance is due on ${dueDate.toDateString()}.`,
          relatedAssetId: schedule.assetId,
        },
      });
      created++;
    }

    this.logger.log(`Maintenance check complete — ${created} notification(s) created`);
    return { checked: schedules.length, created };
  }
}
