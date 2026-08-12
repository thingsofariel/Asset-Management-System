import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { ScanAuditDto } from './dto/scan-audit.dto';

@Controller('audits')
@UseGuards(JwtAuthGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
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
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  scan(@Param('id') id: string, @Body() dto: ScanAuditDto, @CurrentUser() user: { userId: string }) {
    return this.auditsService.scan(id, dto, user?.userId);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  complete(@Param('id') id: string) {
    return this.auditsService.complete(id);
  }
}
