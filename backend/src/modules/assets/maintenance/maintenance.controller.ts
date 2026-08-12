import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { MaintenanceService } from './maintenance.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CreateLogDto } from './dto/create-log.dto';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('schedules')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.maintenanceService.createSchedule(dto);
  }

  @Get('schedules')
  findAllSchedules() {
    return this.maintenanceService.findAllSchedules();
  }

  @Patch('schedules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: { intervalMonths?: number; isActive?: boolean },
  ) {
    return this.maintenanceService.updateSchedule(id, dto);
  }

  @Post('logs')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createLog(@Body() dto: CreateLogDto, @CurrentUser() user: { userId: string }) {
    // Schema always supported loggedById — the original controller just
    // never passed it, so every maintenance log showed no author.
    return this.maintenanceService.createLog(dto, user.userId);
  }

  @Get('logs')
  findLogsForAsset(@Query('assetId') assetId: string) {
    return this.maintenanceService.findLogsForAsset(assetId);
  }
}
