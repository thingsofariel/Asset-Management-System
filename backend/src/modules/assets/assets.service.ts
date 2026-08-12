import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { PUBLIC_USER_SELECT } from '../../shared/prisma-select';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

const QR_DIR = path.join(process.cwd(), process.env.UPLOADS_DIR ?? './uploads', 'qrcodes');

// Was `currentHolder: true` in the original — that returned the entire
// User row, including passwordHash and (now) invite/legacy fields. This
// narrows it to what asset views actually need to display.
const HOLDER_INCLUDE = { currentHolder: { select: PUBLIC_USER_SELECT } };

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });
  }

  private async generateAssetCode(): Promise<string> {
    const count = await this.prisma.asset.count();
    return `AST-${String(count + 1).padStart(6, '0')}`;
  }

  private async generateQrImage(assetCode: string): Promise<string> {
    const filePath = path.join(QR_DIR, `${assetCode}.png`);
    await QRCode.toFile(filePath, assetCode, { width: 400, margin: 2 });
    return `/uploads/qrcodes/${assetCode}.png`;
  }

  async create(dto: CreateAssetDto) {
    const assetCode = await this.generateAssetCode();
    const qrImageUrl = await this.generateQrImage(assetCode);

    return this.prisma.asset.create({
      data: {
        assetCode,
        name: dto.name,
        categoryId: dto.categoryId,
        assetType: dto.assetType,
        brand: dto.brand,
        serialNumber: dto.serialNumber,
        specifications: dto.specifications,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        purchaseCost: dto.purchaseCost,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
        locationId: dto.locationId,
        departmentId: dto.departmentId,
        currentHolderId: dto.currentHolderId,
        qrImageUrl,
      },
      include: { category: true, location: true, department: true, ...HOLDER_INCLUDE },
    });
  }

  findAll(filters: { categoryId?: string; status?: string; search?: string; dueThisMonth?: boolean }) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.prisma.asset.findMany({
      where: {
        categoryId: filters.categoryId || undefined,
        status: (filters.status as any) || undefined,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { assetCode: { contains: filters.search, mode: 'insensitive' } },
                { serialNumber: { contains: filters.search, mode: 'insensitive' } },
                { category: { name: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(filters.dueThisMonth
          ? {
              maintenanceSchedules: {
                some: { isActive: true, nextDueDate: { gte: startOfMonth, lte: endOfMonth } },
              },
            }
          : {}),
      },
      include: { category: true, location: true, department: true, ...HOLDER_INCLUDE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        department: true,
        ...HOLDER_INCLUDE,
        attachments: true,
        maintenanceSchedules: true,
        maintenanceLogs: { orderBy: { serviceDate: 'desc' } },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async findByCode(assetCode: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { assetCode },
      include: { category: true, location: true, department: true },
    });
    if (!asset) throw new NotFoundException('No asset found for this QR code');
    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
      },
      include: { category: true, location: true, department: true, ...HOLDER_INCLUDE },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.delete({ where: { id } });
  }

  async forLabelPrint(ids: string[]) {
    return this.prisma.asset.findMany({
      where: { id: { in: ids } },
      select: { id: true, assetCode: true, name: true, qrImageUrl: true },
    });
  }
}
