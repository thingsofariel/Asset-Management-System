import { Module } from '@nestjs/common';
import { HelpdeskMailerService } from './helpdesk-mailer.service';
import { MailerModule } from '../../core/mailer/mailer.module';

@Module({
  imports: [MailerModule],
  providers: [HelpdeskMailerService],
  exports: [HelpdeskMailerService],
})
export class HelpdeskMailerModule {}
