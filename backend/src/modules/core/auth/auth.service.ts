import { Injectable, UnauthorizedException, ConflictException, GoneException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Fields that never leave this service on any response.
function stripInternalFields<T extends Record<string, any>>(user: T) {
  const {
    passwordHash,
    inviteToken,
    inviteTokenExpiresAt,
    legacyAmsUserId,
    legacyHelpdeskAdminId,
    legacyPayslipEmployeeId,
    ...safeUser
  } = user;
  return safeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // A null passwordHash means the invite hasn't been accepted yet —
    // there's nothing to compare against, so treat it as invalid creds
    // rather than a server error.
    if (!user || !user.passwordHash) return null;

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return null;

    return stripInternalFields(user);
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  // Public — the invitee has no account/JWT yet at this point. Turns
  // a PENDING user into an ACTIVE one by letting them set their own
  // password, then signs them straight in.
  async acceptInvite(token: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { inviteToken: token } });
    if (!user) {
      throw new UnauthorizedException('Invalid or already-used invite link');
    }
    if (user.status !== UserStatus.PENDING) {
      throw new ConflictException('This account has already been activated');
    }
    if (!user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new GoneException('This invite link has expired — ask an admin to send a new one');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const activated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
        inviteToken: null,
        inviteTokenExpiresAt: null,
      },
    });

    const payload = { sub: activated.id, email: activated.email, role: activated.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user: stripInternalFields(activated),
    };
  }

  // Ported from Help Desk's authController.changePassword — same reasoning
  // as updateOwnProfile/updateAvatar in UsersService: this operates on
  // core.User fields, so it belongs in core, not any domain module.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('This account has no password set yet');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password updated' };
  }
}
