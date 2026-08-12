import { Injectable } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Flat list, parents first — the frontend nests it by parentId for
  // the tree-structured dropdown, same as the original.
  findAll() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
    });
  }

  create(data: { name: string; parentId?: number; defaultPriority?: Priority }) {
    return this.prisma.category.create({ data });
  }

  update(id: number, data: { name?: string; parentId?: number; defaultPriority?: Priority }) {
    return this.prisma.category.update({ where: { id }, data });
  }
}
