import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { ScanAuditDto } from './dto/scan-audit.dto';

@Injectable()
export class AuditsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAuditDto, createdById?: string) {
    const activeAssets = await this.prisma.asset.findMany({
      where: { status: { not: 'DISPOSED' } },
      select: { id: true, locationId: true },
    });

    const audit = await this.prisma.audit.create({
      data: {
        name: dto.name,
        startDate: new Date(),
        status: 'IN_PROGRESS',
        createdById,
        items: {
          create: activeAssets.map((a) => ({
            assetId: a.id,
            expectedLocationId: a.locationId,
          })),
        },
      },
      include: { items: true },
    });

    return audit;
  }

  findAll() {
    return this.prisma.audit.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async findOne(id: string) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            asset: { select: { id: true, name: true, assetCode: true } },
            expectedLocation: true,
            scannedLocation: true,
          },
        },
      },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    return audit;
  }

  async scan(auditId: string, dto: ScanAuditDto, scannedById?: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id: auditId } });
    if (!audit) throw new NotFoundException('Audit not found');

    const asset = await this.prisma.asset.findUnique({ where: { assetCode: dto.assetCode } });
    if (!asset) throw new NotFoundException(`No asset found for code ${dto.assetCode}`);

    let item = await this.prisma.auditItem.findFirst({ where: { auditId, assetId: asset.id } });

    const scannedLocationId = dto.scannedLocationId ?? asset.locationId ?? undefined;
    const expectedLocationId = item?.expectedLocationId ?? asset.locationId;
    const matchStatus =
      scannedLocationId && expectedLocationId && scannedLocationId !== expectedLocationId
        ? 'MISMATCH'
        : 'MATCHED';

    const data = {
      scannedLocationId,
      scannedAt: new Date(),
      scannedById,
      conditionStatus: dto.conditionStatus ?? asset.status,
      matchStatus: matchStatus as 'MATCHED' | 'MISMATCH',
      notes: dto.notes,
    };

    if (item) {
      item = await this.prisma.auditItem.update({ where: { id: item.id }, data });
    } else {
      // Asset wasn't in the original snapshot (e.g. created after the audit started).
      item = await this.prisma.auditItem.create({
        data: { auditId, assetId: asset.id, expectedLocationId, ...data },
      });
    }

    return { ...item, asset: { id: asset.id, name: asset.name, assetCode: asset.assetCode } };
  }

  async complete(id: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id }, include: { items: true } });
    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.status === 'COMPLETED') throw new BadRequestException('Audit already completed');

    const unscannedIds = audit.items.filter((i) => !i.scannedAt).map((i) => i.id);
    if (unscannedIds.length > 0) {
      await this.prisma.auditItem.updateMany({
        where: { id: { in: unscannedIds } },
        data: { matchStatus: 'NOT_FOUND' },
      });
    }

    return this.prisma.audit.update({
      where: { id },
      data: { status: 'COMPLETED', endDate: new Date() },
    });
  }
}
