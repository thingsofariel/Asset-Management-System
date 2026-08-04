import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaintenanceService } from './maintenance.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateLogDto } from './dto/create-log.dto';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('schedules')
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.maintenanceService.createSchedule(dto);
  }

  @Get('schedules')
  findAllSchedules() {
    return this.maintenanceService.findAllSchedules();
  }

  @Patch('schedules/:id')
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: { intervalMonths?: number; isActive?: boolean },
  ) {
    return this.maintenanceService.updateSchedule(id, dto);
  }

  @Post('logs')
  createLog(@Body() dto: CreateLogDto) {
    return this.maintenanceService.createLog(dto);
  }

  @Get('logs')
  findLogsForAsset(@Query('assetId') assetId: string) {
    return this.maintenanceService.findLogsForAsset(assetId);
  }
}
