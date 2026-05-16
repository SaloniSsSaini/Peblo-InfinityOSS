import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailQueueService } from '../queue/mail-queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type MembershipRow = {
  role: string;
  workspace: { id: string; name: string; slug: string; type: string; updatedAt: Date };
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailQueue: MailQueueService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const slugBase = dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        memberships: {
          create: {
            role: 'OWNER',
            joinedAt: new Date(),
            workspace: {
              create: {
                name: `${dto.name ?? dto.email}'s space`,
                slug,
                type: 'PERSONAL',
              },
            },
          },
        },
      },
      include: {
        memberships: { include: { workspace: true } },
      },
    });

    const tokens = this.signTokens(user.id, user.email);
    return {
      user: this.stripUser(user),
      workspaces: this.mapWorkspaces(user.memberships as MembershipRow[]),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: { include: { workspace: true } } },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      user: this.stripUser(user),
      workspaces: this.mapWorkspaces(user.memberships as MembershipRow[]),
      ...this.signTokens(user.id, user.email),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { workspace: true } } },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      user: this.stripUser(user),
      workspaces: this.mapWorkspaces(user.memberships as MembershipRow[]),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: { name?: string | null; avatarUrl?: string | null } = {};
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      data.name = trimmed.length ? trimmed : null;
    }
    if (dto.avatarUrl !== undefined) {
      const trimmed = dto.avatarUrl.trim();
      if (!trimmed) {
        data.avatarUrl = null;
      } else if (!/^https:\/\/.+/i.test(trimmed)) {
        throw new BadRequestException('Avatar URL must use https://');
      } else {
        data.avatarUrl = trimmed;
      }
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: { memberships: { include: { workspace: true } } },
    });
    return {
      user: this.stripUser(user),
      workspaces: this.mapWorkspaces(user.memberships as MembershipRow[]),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException('Password login is not enabled for this account');
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { changed: true };
  }

  async requestPasswordReset(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const message =
      'If an account exists for that email, password reset instructions have been issued.';

    if (!user?.passwordHash) {
      return { message };
    }

    const token = this.signPasswordResetToken(user.id, user.email);
    const webOrigin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',')[0]!.trim();
    const resetUrl = `${webOrigin.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;

    const exposeDev =
      process.env.NODE_ENV !== 'production' ||
      process.env.PASSWORD_RESET_EXPOSE_TOKEN === '1';

    if (exposeDev) {
      this.logger.log(`[password-reset] ${email} → ${resetUrl}`);
      return { message, resetUrl, token };
    }

    if (this.mailQueue.isConfigured()) {
      try {
        await this.mailQueue.sendPasswordReset({
          to: email,
          resetUrl,
          name: user.name,
        });
      } catch (err) {
        this.logger.error(
          `Failed to queue/send password reset email to ${email}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    } else {
      this.logger.warn(
        `Password reset requested for ${email} but mail is not configured`,
      );
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: { sub: string; email: string; typ?: string };
    try {
      payload = this.jwt.verify(dto.token, {
        secret: this.passwordResetSecret(),
      }) as { sub: string; email: string; typ?: string };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (payload.typ !== 'password-reset') {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.email !== payload.email) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return { reset: true };
  }

  private signPasswordResetToken(userId: string, email: string) {
    return this.jwt.sign(
      { sub: userId, email, typ: 'password-reset' },
      { secret: this.passwordResetSecret(), expiresIn: '1h' },
    );
  }

  private passwordResetSecret() {
    return (
      process.env.PASSWORD_RESET_SECRET ??
      process.env.JWT_REFRESH_SECRET ??
      'dev-password-reset-secret'
    );
  }

  private mapWorkspaces(memberships: MembershipRow[]) {
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      type: m.workspace.type,
      role: m.role,
      updatedAt: m.workspace.updatedAt,
    }));
  }

  private signTokens(sub: string, email: string) {
    const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
    const accessToken = this.jwt.sign(
      { sub, email },
      { secret: accessSecret, expiresIn: '15m' },
    );
    const refreshToken = this.jwt.sign(
      { sub, email, typ: 'refresh' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  private stripUser(user: { id: string; email: string; name: string | null; avatarUrl: string | null }) {
    return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
  }
}
