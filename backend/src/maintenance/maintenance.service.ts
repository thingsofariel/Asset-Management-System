import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateLogDto } from './dto/create-log.dto';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  createSchedule(dto: CreateScheduleDto) {
    const nextDueDate = dto.nextDueDate
      ? new Date(dto.nextDueDate)
      : addMonths(new Date(), dto.intervalMonths);

    return this.prisma.maintenanceSchedule.create({
      data: {
        assetId: dto.assetId,
        intervalMonths: dto.intervalMonths,
        nextDueDate,
      },
      include: { asset: { select: { id: true, name: true, assetCode: true } } },
    });
  }

  findAllSchedules() {
    return this.prisma.maintenanceSchedule.findMany({
      where: { isActive: true },
      include: { asset: { select: { id: true, name: true, assetCode: true, status: true } } },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async updateSchedule(id: string, data: { intervalMonths?: number; isActive?: boolean }) {
    const existing = await this.prisma.maintenanceSchedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Schedule not found');
    return this.prisma.maintenanceSchedule.update({ where: { id }, data });
  }

  async createLog(dto: CreateLogDto) {
    const log = await this.prisma.maintenanceLog.create({
      data: {
        assetId: dto.assetId,
        scheduleId: dto.scheduleId,
        serviceDate: new Date(dto.serviceDate),
        vendorName: dto.vendorName,
        technicianName: dto.technicianName,
        partsReplaced: dto.partsReplaced,
        cost: dto.cost,
        notes: dto.notes,
      },
    });

    // Roll the schedule forward and clear the asset's maintenance-pending status.
    let schedule = dto.scheduleId
      ? await this.prisma.maintenanceSchedule.findUnique({ where: { id: dto.scheduleId } })
      : await this.prisma.maintenanceSchedule.findFirst({
          where: { assetId: dto.assetId, isActive: true },
        });

    if (schedule) {
      await this.prisma.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastServiceDate: new Date(dto.serviceDate),
          nextDueDate: addMonths(new Date(dto.serviceDate), schedule.intervalMonths),
        },
      });
    }

    await this.prisma.asset.update({
      where: { id: dto.assetId },
      data: { status: 'GOOD' },
    });

    return log;
  }

  findLogsForAsset(assetId: string) {
    return this.prisma.maintenanceLog.findMany({
      where: { assetId },
      orderBy: { serviceDate: 'desc' },
    });
  }
}
