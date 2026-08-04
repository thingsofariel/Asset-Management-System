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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.assetsService.findAll({ categoryId, status, search });
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
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
