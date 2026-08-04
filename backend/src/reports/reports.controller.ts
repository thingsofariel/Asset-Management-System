import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-summary')
  dashboardSummary() {
    return this.reportsService.dashboardSummary();
  }

  @Get('depreciation')
  depreciation() {
    return this.reportsService.depreciation();
  }

  @Get('maintenance-costs')
  maintenanceCosts() {
    return this.reportsService.maintenanceCosts();
  }
}
