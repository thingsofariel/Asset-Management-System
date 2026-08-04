import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { ScanAuditDto } from './dto/scan-audit.dto';

@Controller('audits')
@UseGuards(JwtAuthGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  create(@Body() dto: CreateAuditDto, @CurrentUser() user: { userId: string }) {
    return this.auditsService.create(dto, user?.userId);
  }

  @Get()
  findAll() {
    return this.auditsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditsService.findOne(id);
  }

  @Post(':id/scan')
  scan(@Param('id') id: string, @Body() dto: ScanAuditDto, @CurrentUser() user: { userId: string }) {
    return this.auditsService.scan(id, dto, user?.userId);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.auditsService.complete(id);
  }
}
