import { Module } from '@nestjs/common';
import { PayslipsService } from './payslips.service';
import { PayslipsController } from './payslips.controller';
import { PublicPayslipController } from './public-payslip.controller';
import { PdfModule } from '../pdf/pdf.module';
import { PayrollMailerModule } from '../mailer/mailer.module';

@Module({
  imports: [PdfModule, PayrollMailerModule],
  controllers: [PayslipsController, PublicPayslipController],
  providers: [PayslipsService],
  exports: [PayslipsService],
})
export class PayslipsModule {}
