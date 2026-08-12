import { Module } from '@nestjs/common';
import { PayrollMailerService } from './payroll-mailer.service';
import { MailerModule } from '../../core/mailer/mailer.module';

@Module({
  imports: [MailerModule],
  providers: [PayrollMailerService],
  exports: [PayrollMailerService],
})
export class PayrollMailerModule {}
