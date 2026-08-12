import { Controller, Get, Param } from '@nestjs/common';
import { PayslipsService } from './payslips.service';

// Deliberately its own controller with no @UseGuards at all — the one
// payslip endpoint meant to work without logging in (QR-scan
// verification). The original had to carefully mount this router
// BEFORE the authenticated one to stop Express's global
// `router.use(authenticate)` from swallowing it. NestJS guards are
// scoped per-controller instead of applied via sequential middleware,
// so that entire class of ordering bug can't happen here — this
// controller has no guard, full stop, regardless of module import order.
@Controller('payslips/verify')
export class PublicPayslipController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Get(':hash')
  verify(@Param('hash') hash: string) {
    return this.payslipsService.verifyByHash(hash);
  }
}
