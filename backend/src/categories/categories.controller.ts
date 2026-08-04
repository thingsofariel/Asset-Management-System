import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import { AssetType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';

class CategoryDto {
  @IsString() name: string;
  @IsEnum(AssetType) assetType: AssetType;
}

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  create(@Body() dto: CategoryDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CategoryDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
