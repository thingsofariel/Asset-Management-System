import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

// Was @Controller('reports') — namespaced under assets/ now that
// helpdesk and payroll are each going to want their own report
// endpoints too, and 'reports' alone would collide once they land.
@Controller('assets/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
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
