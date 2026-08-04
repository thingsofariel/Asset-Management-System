import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  create(@Body() dto: CreateMovementDto, @CurrentUser() user: { userId: string }) {
    return this.movementsService.create(dto, user?.userId);
  }

  @Get()
  findAll(@Query('assetId') assetId?: string) {
    return assetId ? this.movementsService.findForAsset(assetId) : this.movementsService.findAll();
  }
}
