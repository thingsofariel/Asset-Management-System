import { Injectable, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { SAFE_USER_SELECT } from './safe-user';

const INVITE_EXPIRES_IN_DAYS = Number(process.env.INVITE_EXPIRES_IN_DAYS ?? 7);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Admin-only. Creates a PENDING account with no password — the
  // invitee sets one themselves via POST /auth/accept-invite.
  // No email service exists yet in any of the three legacy systems,
  // so this hands the raw link straight back to the calling admin to
  // share manually, rather than assuming delivery is already wired up.
  //
  // `client` defaults to the regular PrismaService, but accepts a
  // transaction client too — payroll's employee-creation flow calls
  // this from inside its own $transaction so the User and the
  // Employee record it links to are created atomically.
  async invite(
    dto: InviteUserDto,
    invitedById: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existing = await client.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const inviteToken = randomBytes(32).toString('hex');
    const inviteTokenExpiresAt = new Date(Date.now() + INVITE_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

    const user = await client.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        departmentId: dto.departmentId,
        role: dto.role ?? Role.EMPLOYEE,
        status: UserStatus.PENDING,
        inviteToken,
        inviteTokenExpiresAt,
        invitedById,
      },
      select: SAFE_USER_SELECT,
    });

    const inviteLink = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/accept-invite?token=${inviteToken}`;

    return { user, inviteLink };
  }

  findAll() {
    return this.prisma.user.findMany({ select: SAFE_USER_SELECT });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  }

  // Ported from Help Desk's authController.updateProfile — that only
  // ever updated admin_users, which is now just a User with role
  // ADMIN. Since fullName/email are core fields, self-service profile
  // editing belongs here, not in any domain module.
  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException('That email is already in use');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, email: dto.email },
      select: SAFE_USER_SELECT,
    });
  }

  // Ported from Help Desk's authController.uploadAvatar — same reasoning.
  updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: SAFE_USER_SELECT,
    });
  }
}

