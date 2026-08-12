import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { PayslipsService } from './payslips.service';
import { CreatePayslipDto } from './dto/create-payslip.dto';

@Controller('payslips')
@UseGuards(JwtAuthGuard)
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  // ADMIN sees everyone (optionally filtered); EMPLOYEE only ever sees
  // their own — enforced inside the service from the verified JWT, not
  // from any query param the client could tamper with.
  @Get()
  findAll(
    @CurrentUser() user: { userId: string; role: Role },
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.payslipsService.listForUser(user, { employeeId, year, month });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreatePayslipDto, @CurrentUser() user: { userId: string }) {
    return this.payslipsService.create(dto, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string; role: Role }) {
    return this.payslipsService.findOneForUser(Number(id), user);
  }

  @Patch(':id/finalize')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  finalize(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.payslipsService.finalize(Number(id), user.userId);
  }

  @Patch(':id/mark-sent')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  markSent(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.payslipsService.markSent(Number(id), user.userId);
  }

  @Post(':id/share-link')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  shareLink(@Param('id') id: string) {
    return this.payslipsService.getOrCreateShareLink(Number(id));
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: Role },
    @Res() res: Response,
  ) {
    // findOneForUser() already enforces ownership (404s for a non-owner
    // EMPLOYEE) — no separate check needed here.
    const payslip = await this.payslipsService.findOneForUser(Number(id), user);
    const filePath = await this.payslipsService.servePdfFile(payslip);
    res.download(filePath, `payslip-${payslip.payslipId}.pdf`);
  }

  // Share-token access still requires login + ownership — this is NOT
  // the public route (that's PublicPayslipController's verify-by-hash
  // endpoint). A share link is a convenience for the employee's own
  // access, not a bypass of auth.
  @Get('share/:token/pdf')
  async downloadPdfByShareToken(
    @Param('token') token: string,
    @CurrentUser() user: { userId: string; role: Role },
    @Res() res: Response,
  ) {
    const payslip = await this.payslipsService.loadFullByShareToken(token);
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (!(await this.payslipsService.canAccessLoaded(payslip, user))) {
      throw new NotFoundException('Payslip not found');
    }
    const filePath = await this.payslipsService.servePdfFile(payslip);
    res.download(filePath, `payslip-${payslip.payslipId}.pdf`);
  }
}
