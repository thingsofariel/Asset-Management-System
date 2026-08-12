import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Simple defaults since per-asset useful life isn't captured yet — a reasonable
// starting estimate, clearly labeled as such in the UI rather than presented as exact.
const DEFAULT_USEFUL_LIFE_YEARS: Record<'FIXED' | 'ELECTRONIC', number> = {
  FIXED: 10,
  ELECTRONIC: 4,
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboardSummary() {
    const [totalAssets, byStatusRaw, upcomingMaintenance, totalAttachments] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.maintenanceSchedule.count({
        where: {
          isActive: true,
          nextDueDate: { lte: new Date(Date.now() + 30 * 86400000) },
        },
      }),
      this.prisma.assetAttachment.count(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRaw) byStatus[row.status] = row._count.status;

    const damagedCount = (byStatus.UNDER_REPAIR ?? 0) + (byStatus.UNSERVICEABLE ?? 0);

    return {
      totalAssets,
      byStatus,
      damagedCount,
      upcomingMaintenance,
      totalAttachments,
    };
  }

  async depreciation() {
    const assets = await this.prisma.asset.findMany({
      where: { purchaseCost: { not: null }, purchaseDate: { not: null } },
      select: {
        id: true,
        name: true,
        assetCode: true,
        assetType: true,
        purchaseCost: true,
        purchaseDate: true,
      },
    });

    const now = new Date();

    return assets.map((asset) => {
      const usefulLifeYears = DEFAULT_USEFUL_LIFE_YEARS[asset.assetType];
      const cost = Number(asset.purchaseCost);
      const annualDepreciation = cost / usefulLifeYears;
      const yearsElapsed = Math.max(
        0,
        (now.getTime() - new Date(asset.purchaseDate!).getTime()) / (365.25 * 86400000),
      );
      const depreciatedSoFar = Math.min(cost, annualDepreciation * yearsElapsed);
      const bookValue = Math.max(0, cost - depreciatedSoFar);

      return {
        assetId: asset.id,
        name: asset.name,
        assetCode: asset.assetCode,
        purchaseCost: cost,
        usefulLifeYears,
        annualDepreciation: Math.round(annualDepreciation * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100,
      };
    });
  }

  async maintenanceCosts() {
    const logs = await this.prisma.maintenanceLog.findMany({
      where: { cost: { not: null } },
      select: { cost: true, serviceDate: true },
    });

    const byMonth: Record<string, number> = {};
    for (const log of logs) {
      const key = `${log.serviceDate.getFullYear()}-${String(log.serviceDate.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + Number(log.cost);
    }

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));
  }
}
