import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { AttachmentType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { AttachmentsService } from './attachments.service';

const ATTACHMENTS_DIR = path.join(
  process.cwd(),
  process.env.UPLOADS_DIR ?? './uploads',
  'attachments',
);
if (!fs.existsSync(ATTACHMENTS_DIR)) fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: ATTACHMENTS_DIR,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('assetId') assetId: string,
    @Body('fileType') fileType: AttachmentType,
    @CurrentUser() user: { userId: string },
    @Body('notes') notes?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!assetId) throw new BadRequestException('assetId is required');

    return this.attachmentsService.create({
      assetId,
      fileUrl: `/uploads/attachments/${file.filename}`,
      fileType: fileType ?? 'OTHER',
      notes,
      // The schema always supported this — the original controller just
      // never passed it through, so every attachment showed no uploader.
      uploadedById: user.userId,
    });
  }

  @Get('asset/:assetId')
  findForAsset(@Param('assetId') assetId: string) {
    return this.attachmentsService.findForAsset(assetId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
