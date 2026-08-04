import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttachmentType } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    assetId: string;
    fileUrl: string;
    fileType: AttachmentType;
    notes?: string;
    uploadedById?: string;
  }) {
    return this.prisma.assetAttachment.create({ data });
  }

  findForAsset(assetId: string) {
    return this.prisma.assetAttachment.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
    });
  }

  remove(id: string) {
    return this.prisma.assetAttachment.delete({ where: { id } });
  }
}
