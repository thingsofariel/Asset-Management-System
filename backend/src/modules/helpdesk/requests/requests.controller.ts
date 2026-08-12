import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, interval, map, merge } from 'rxjs';
import { Priority, RequestStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { SseAuthGuard } from './sse-auth.guard';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { AcceptRequestDto } from './dto/accept-request.dto';
import { DenyRequestDto } from './dto/deny-request.dto';

const ATTACHMENTS_DIR = path.join(process.cwd(), process.env.UPLOADS_DIR ?? './uploads', 'helpdesk');
if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // -------- Public --------

  @Post()
  @UseInterceptors(
    FileInterceptor('attachment', {
      storage: diskStorage({
        destination: ATTACHMENTS_DIR,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${path.extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Unsupported file type. Allowed: Word, Excel, PPT, PDF, or image files.'), false);
      },
    }),
  )
  create(@Body() dto: CreateRequestDto, @UploadedFile() file?: Express.Multer.File) {
    const attachmentUrl = file ? `/uploads/helpdesk/${file.filename}` : undefined;
    return this.requestsService.create(dto, attachmentUrl);
  }

  @Get('lookup/:code')
  lookup(@Param('code') code: string) {
    return this.requestsService.findByCode(code);
  }

  @Post('lookup/:code/review')
  submitReview(@Param('code') code: string, @Body() dto: SubmitReviewDto) {
    return this.requestsService.submitReview(code, dto);
  }

  // -------- Admin --------

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Query('status') status?: RequestStatus, @Query('priority') priority?: Priority) {
    return this.requestsService.findAll({ status, priority });
  }

  // SSE stream of new-request events for connected admin dashboards.
  // Auth is via ?token= (see SseAuthGuard), not a Bearer header — a
  // browser EventSource can't set one.
  @Sse('stream')
  @UseGuards(SseAuthGuard)
  stream(): Observable<MessageEvent> {
    // NestJS's @Sse() always frames a `data:` line — there's no equivalent
    // of the original's bare `: ping` comment frame — so keep-alive here
    // is a periodic 'ping' event instead. Functionally the same: keeps
    // idle connections alive through proxies that would otherwise time
    // out a silent long-lived connection.
    const ping$: Observable<MessageEvent> = interval(25000).pipe(map(() => ({ type: 'ping', data: null })));
    const events$: Observable<MessageEvent> = this.requestsService.eventStream.pipe(
      map((event) => ({ type: event.type, data: event.data })),
    );
    return merge(events$, ping$);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(Number(id));
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  accept(@Param('id') id: string, @Body() dto: AcceptRequestDto) {
    return this.requestsService.accept(Number(id), dto);
  }

  @Patch(':id/deny')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deny(@Param('id') id: string, @Body() dto: DenyRequestDto) {
    return this.requestsService.deny(Number(id), dto);
  }

  @Patch(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  start(@Param('id') id: string) {
    return this.requestsService.start(Number(id));
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  complete(@Param('id') id: string) {
    return this.requestsService.complete(Number(id));
  }
}
