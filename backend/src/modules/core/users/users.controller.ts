import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';

const AVATAR_DIR = path.join(process.cwd(), process.env.UPLOADS_DIR ?? './uploads', 'avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin-only, same reasoning as before: EMPLOYEE is a real role now,
  // so this can't be left open to any logged-in user. Creates a
  // PENDING account — the invitee activates it via accept-invite.
  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  invite(@Body() dto: InviteUserDto, @CurrentUser() admin: { userId: string }) {
    return this.usersService.invite(dto, admin.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  // Must be declared before ':id' — otherwise ':id' would match "me" first.
  @Get('me')
  me(@CurrentUser() user: { userId: string }) {
    return this.usersService.findOne(user.userId);
  }

  // Ported from Help Desk's PATCH /auth/profile — self-service, any
  // authenticated user, not just admins.
  @Patch('me')
  updateOwnProfile(@CurrentUser() user: { userId: string }, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateOwnProfile(user.userId, dto);
  }

  // Ported from Help Desk's POST /auth/avatar. Same multer pattern
  // used in the assets/attachments upload.
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: AVATAR_DIR,
        filename: (req: any, _file, cb) => {
          const userId = req.user?.userId ?? 'unknown';
          cb(null, `${userId}-${Date.now()}${path.extname(_file.originalname)}`);
        },
      }),
      limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { userId: string }) {
    if (!file) throw new BadRequestException('No image file received');
    return this.usersService.updateAvatar(user.userId, `/uploads/avatars/${file.filename}`);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
