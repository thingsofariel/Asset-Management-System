import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

const STATUS_LIST = Object.values(RequestStatus);

function monthRange(month?: string): { gte: Date; lt: Date } | undefined {
  if (!month) return undefined;
  const gte = new Date(`${month}-01T00:00:00.000Z`);
  const lt = new Date(gte);
  lt.setUTCMonth(lt.getUTCMonth() + 1);
  return { gte, lt };
}

function formatFullTimestamp(value: Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard aggregates for a given month (all-time if omitted). */
  async dashboard(month?: string) {
    const range = monthRange(month);
    const dateFilter = range ? { createdAt: range } : {};

    const counts = await this.prisma.request.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { status: true },
    });
    const statusCounts = STATUS_LIST.map((status) => ({
      status,
      count: counts.find((c) => c.status === status)?._count.status ?? 0,
    }));
    const totalCount = statusCounts.reduce((sum, s) => sum + s.count, 0);

    const byPriority = await this.prisma.request.groupBy({
      by: ['priority'],
      where: dateFilter,
      _count: { priority: true },
    });
    const priorityCounts = (['HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => ({
      priority,
      count: byPriority.find((c) => c.priority === priority)?._count.priority ?? 0,
    }));

    // Prisma has no EXTRACT(EPOCH ...) aggregate — computed here from the
    // raw pairs instead of a raw SQL query.
    const resolved = await this.prisma.request.findMany({
      where: { ...dateFilter, completedAt: { not: null }, acceptedAt: { not: null } },
      select: { acceptedAt: true, completedAt: true },
    });
    const avgResolutionHours = resolved.length
      ? Math.round(
          (resolved.reduce((sum, r) => sum + (r.completedAt!.getTime() - r.acceptedAt!.getTime()), 0) /
            resolved.length /
            3600000) *
            100,
        ) / 100
      : null;

    const categoryRows = await this.prisma.request.findMany({
      where: dateFilter,
      select: { customCategoryText: true, category: { select: { name: true } } },
    });
    const byCategory = new Map<string, number>();
    for (const row of categoryRows) {
      const key = row.category?.name ?? row.customCategoryText ?? 'Uncategorized';
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }
    const requestsByCategory = [...byCategory.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const reviewAgg = await this.prisma.requestReview.aggregate({
      where: range ? { request: { createdAt: range } } : {},
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      month: month || 'all-time',
      statusCounts,
      totalCount,
      priorityCounts,
      avgResolutionHours,
      requestsByCategory,
      avgRating: reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 100) / 100 : null,
      reviewCount: reviewAgg._count.rating,
    };
  }

  private async fetchReportRows(month: string, status?: string) {
    const range = monthRange(month)!;
    const rows = await this.prisma.request.findMany({
      where: { createdAt: range, status: status as RequestStatus | undefined },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((r, index) => ({
      no: index + 1,
      fullName: r.fullName,
      phone: r.phone,
      email: r.email,
      issueType: r.customCategoryText || r.category?.name || 'General issue',
      description: r.description,
      attachmentUrl: r.attachmentUrl,
      publicCode: r.publicCode,
      status: r.status,
      createdAt: r.createdAt,
      acceptedAt: r.acceptedAt,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      closedAt: r.closedAt,
    }));
  }

  /** JSON version of the same data the Excel export produces. */
  async reportRows(month?: string, status?: string) {
    const resolvedMonth = month || new Date().toISOString().slice(0, 7);
    const rows = await this.fetchReportRows(resolvedMonth, status);
    return { month: resolvedMonth, status: status || 'all', rows };
  }

  async exportReport(month?: string, status?: string) {
    const resolvedMonth = month || new Date().toISOString().slice(0, 7);
    const rows = await this.fetchReportRows(resolvedMonth, status);

    const data = rows.map((r) => ({
      'No.': r.no,
      'Full Name': r.fullName,
      'Phone Number': r.phone,
      Email: r.email,
      'Issue Type': r.issueType,
      Description: r.description,
      'Attachment File': r.attachmentUrl || '',
      'Request ID': r.publicCode,
      Status: r.status,
      'Submitted At': formatFullTimestamp(r.createdAt),
      'Accepted At': formatFullTimestamp(r.acceptedAt),
      'Started At': formatFullTimestamp(r.startedAt),
      'Completed At': formatFullTimestamp(r.completedAt),
      'Closed At': formatFullTimestamp(r.closedAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 20 },
      { wch: 40 }, { wch: 24 }, { wch: 16 }, { wch: 12 },
      { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Report ${resolvedMonth}`);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return { buffer, filename: `helpdesk-report-${resolvedMonth}${status ? `-${status}` : ''}.xlsx` };
  }
}
