import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { HelpdeskMailerModule } from '../mailer/mailer.module';

@Module({
  imports: [HelpdeskMailerModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
