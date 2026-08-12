import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Priority, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsInt() parentId?: number;
  @IsOptional() @IsEnum(Priority) defaultPriority?: Priority;
}

class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() parentId?: number;
  @IsOptional() @IsEnum(Priority) defaultPriority?: Priority;
}

// Was @Controller('categories') — namespaced under helpdesk/ since
// AssetCategory already owns the bare /categories path.
@Controller('helpdesk/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // Public — needed to populate the request submission dropdown.
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(Number(id), dto);
  }
}
