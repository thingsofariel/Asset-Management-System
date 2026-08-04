import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMovementDto, processedById?: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const fromLocationId = asset.locationId;
    const fromUserId = asset.currentHolderId;
    const assetUpdate: Record<string, any> = {};

    switch (dto.movementType) {
      case 'INBOUND':
        if (dto.toLocationId) assetUpdate.locationId = dto.toLocationId;
        assetUpdate.status = 'GOOD';
        break;

      case 'OUTBOUND':
        assetUpdate.status = 'DISPOSED';
        assetUpdate.currentHolderId = null;
        break;

      case 'CHECKOUT':
        if (!dto.toUserId) throw new BadRequestException('toUserId is required for a checkout');
        assetUpdate.currentHolderId = dto.toUserId;
        break;

      case 'CHECKIN':
        assetUpdate.currentHolderId = null;
        if (dto.toLocationId) assetUpdate.locationId = dto.toLocationId;
        break;

      case 'TRANSFER':
        if (!dto.toLocationId) throw new BadRequestException('toLocationId is required for a transfer');
        assetUpdate.locationId = dto.toLocationId;
        break;
    }

    await this.prisma.asset.update({ where: { id: dto.assetId }, data: assetUpdate });

    return this.prisma.assetMovement.create({
      data: {
        assetId: dto.assetId,
        movementType: dto.movementType,
        fromLocationId,
        toLocationId: dto.toLocationId,
        fromUserId,
        toUserId: dto.toUserId,
        processedById,
        notes: dto.notes,
      },
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
        fromLocation: true,
        toLocation: true,
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
  }

  findAll() {
    return this.prisma.assetMovement.findMany({
      orderBy: { movementDate: 'desc' },
      take: 100,
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
        fromLocation: true,
        toLocation: true,
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
  }

  findForAsset(assetId: string) {
    return this.prisma.assetMovement.findMany({
      where: { assetId },
      orderBy: { movementDate: 'desc' },
      include: {
        fromLocation: true,
        toLocation: true,
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
  }
}
