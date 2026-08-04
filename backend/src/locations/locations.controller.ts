import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocationsService } from './locations.service';

class LocationDto {
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsString() floor?: string;
  @IsString() room: string;
}

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  create(@Body() dto: LocationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<LocationDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
