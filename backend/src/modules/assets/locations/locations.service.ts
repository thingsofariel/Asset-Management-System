import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { building?: string; floor?: string; room: string }) {
    return this.prisma.location.create({ data });
  }

  findAll() {
    return this.prisma.location.findMany({ orderBy: { room: 'asc' } });
  }

  update(id: string, data: { building?: string; floor?: string; room?: string }) {
    return this.prisma.location.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.location.delete({ where: { id } });
  }
}
