import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // Mutations are ADMIN-only — completes the "single Admin role with
  // full access" v1 design, which was previously moot since no other
  // role existed to be excluded from it. Reads stay open to any
  // authenticated user (including EMPLOYEE).
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dueThisMonth') dueThisMonth?: string,
  ) {
    return this.assetsService.findAll({ categoryId, status, search, dueThisMonth: dueThisMonth === 'true' });
  }

  // Placed before ':id' so "code" isn't swallowed as an id param.
  @Get('code/:assetCode')
  findByCode(@Param('assetCode') assetCode: string) {
    return this.assetsService.findByCode(assetCode);
  }

  @Get('labels')
  forLabelPrint(@Query('ids') ids: string) {
    const idList = (ids ?? '').split(',').filter(Boolean);
    return this.assetsService.forLabelPrint(idList);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
