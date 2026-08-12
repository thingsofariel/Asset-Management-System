import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

// Was @Controller('reports') — namespaced under helpdesk/ for the same
// reason as categories: assets/reports already owns the bare /reports path.
@Controller('helpdesk/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  dashboard(@Query('month') month?: string) {
    return this.reportsService.dashboard(month);
  }

  @Get('requests')
  reportRows(@Query('month') month?: string, @Query('status') status?: string) {
    return this.reportsService.reportRows(month, status);
  }

  @Get('export')
  async exportReport(@Query('month') month: string | undefined, @Query('status') status: string | undefined, @Res() res: Response) {
    const { buffer, filename } = await this.reportsService.exportReport(month, status);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
