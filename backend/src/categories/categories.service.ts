import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; assetType: AssetType }) {
    return this.prisma.assetCategory.create({ data });
  }

  findAll() {
    return this.prisma.assetCategory.findMany({ orderBy: { name: 'asc' } });
  }

  update(id: string, data: { name?: string; assetType?: AssetType }) {
    return this.prisma.assetCategory.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.assetCategory.delete({ where: { id } });
  }
}
