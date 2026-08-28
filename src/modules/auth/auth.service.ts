import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import {
  AuthResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';
import type { UserRole } from '@generated/prisma/enums';

import { sendPasswordResetOtp } from './utils/send-password-reset-otp.util';

import { parseDurationToMs } from '@/utils/duration.util';
import { normalizeEmail } from '@/utils/email.util';
import { generatePasswordResetOtp } from '@/utils/otp.util';
import { generateRefreshToken, hashToken } from '@/utils/token.util';
import { hashPassword, verifyPassword } from '@/utils/password.util';

type AuthSessionResult = AuthResponseDto & {
  refreshToken: string;
  refreshMaxAgeMs: number;
};

const REGISTRATION_FAILED_MESSAGE =
  'Unable to register with the provided credentials';

const PASSWORD_RESET_REQUESTED_MESSAGE =
  'If an account exists for this email, a password reset code has been sent';

const INVALID_RESET_OTP_MESSAGE = 'Invalid or expired reset code';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    data: RegisterDto,
    deviceName?: string,
  ): Promise<AuthSessionResult> {
    const email = normalizeEmail(data.email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      // Same generic error as unique-constraint races — avoid email enumeration.
      throw new BadRequestException(REGISTRATION_FAILED_MESSAGE);
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: await hashPassword(data.password),
        },
      });

      return this.issueSession(user.id, user.email, user.role, deviceName);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(REGISTRATION_FAILED_MESSAGE);
      }

      throw error;
    }
  }

  async login(dto: LoginDto, deviceName?: string): Promise<AuthSessionResult> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const isPasswordValid = await verifyPassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    return this.issueSession(user.id, user.email, user.role, deviceName);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthSessionResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const refreshTokenHash = hashToken(refreshToken);

    const candidate = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { user: true },
    });

    if (!candidate) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshMaxAgeMs = this.getRefreshMaxAgeMs();

    const nextRefreshToken = generateRefreshToken();
    const accessToken = await this.signAccessToken(
      candidate.user.id,
      candidate.user.email,
      candidate.familyId,
    );

    const now = new Date();

    const rotationStatus = await this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { refreshTokenHash },
      });

      if (!session || session.expiresAt.getTime() <= now.getTime()) {
        return 'invalid' as const;
      }

      if (session.revokedAt) {
        await tx.session.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: now },
        });

        return 'reused' as const;
      }

      const claimed = await tx.session.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });

      if (claimed.count !== 1) {
        await tx.session.updateMany({
          where: { familyId: session.familyId, revokedAt: null },
          data: { revokedAt: now },
        });
        return 'reused' as const;
      }

      await tx.session.create({
        data: {
          userId: session.userId,
          familyId: session.familyId,
          refreshTokenHash: hashToken(nextRefreshToken),
          deviceName: session.deviceName,
          expiresAt: new Date(now.getTime() + refreshMaxAgeMs),
        },
      });

      return 'rotated' as const;
    });

    if (rotationStatus !== 'rotated') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      refreshMaxAgeMs,
      user: {
        id: candidate.user.id,
        email: candidate.user.email,
        role: candidate.user.role,
      },
    };
  }

  async logout(refreshToken: string | undefined): Promise<{ message: string }> {
    if (!refreshToken) {
      return { message: 'Logged out successfully' };
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
    });

    if (session && !session.revokedAt) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: PASSWORD_RESET_REQUESTED_MESSAGE };
    }

    const otp = generatePasswordResetOtp();
    const passwordResetOtpHash = hashToken(otp);
    const environment = this.configService.get<string>('app.environment');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetOtpHash,
        passwordResetExpiresAt: new Date(
          Date.now() + this.getPasswordResetMaxAgeMs(),
        ),
      },
    });

    await sendPasswordResetOtp(email, otp, environment);

    return {
      message: PASSWORD_RESET_REQUESTED_MESSAGE,
      ...(environment === 'production' ? {} : { otp }),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const email = normalizeEmail(dto.email);
    const passwordResetOtpHash = hashToken(dto.otp);
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      user?.passwordResetOtpHash !== passwordResetOtpHash ||
      (user?.passwordResetExpiresAt?.getTime() ?? 0) <= now.getTime()
    ) {
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    const isSamePassword = await verifyPassword(dto.newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const password = await hashPassword(dto.newPassword);

    const claimed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: user.id,
          passwordResetOtpHash,
          passwordResetExpiresAt: { gt: now },
        },
        data: {
          password,
          passwordResetOtpHash: null,
          passwordResetExpiresAt: null,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      await tx.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });

      return true;
    });

    if (!claimed) {
      throw new BadRequestException(INVALID_RESET_OTP_MESSAGE);
    }

    return { message: 'Password reset successfully' };
  }

  // ================ Non Routed Methods =================

  async revokeOtherSessionFamilies(
    userId: string,
    exceptFamilyId?: string,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptFamilyId ? { familyId: { not: exceptFamilyId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  async assertActiveAccessSession(
    userId: string,
    familyId: string,
  ): Promise<{ role: UserRole }> {
    const session = await this.prisma.session.findFirst({
      where: {
        userId,
        familyId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, user: { select: { role: true } } },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }

    return { role: session.user.role };
  }

  // ================ Private Methods =================

  private async issueSession(
    userId: string,
    email: string,
    role: UserRole,
    deviceName?: string,
  ): Promise<AuthSessionResult> {
    const familyId = randomUUID();
    const accessToken = await this.signAccessToken(userId, email, familyId);

    const refreshMaxAgeMs = this.getRefreshMaxAgeMs();
    const refreshToken = generateRefreshToken();

    await this.prisma.session.create({
      data: {
        userId,
        familyId,
        refreshTokenHash: hashToken(refreshToken),
        deviceName: deviceName?.slice(0, 255) ?? null,
        expiresAt: new Date(Date.now() + refreshMaxAgeMs),
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshMaxAgeMs,
      user: {
        id: userId,
        email,
        role,
      },
    };
  }

  private getRefreshMaxAgeMs(): number {
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'app.jwtRefreshExpiresIn',
    );
    return parseDurationToMs(refreshExpiresIn);
  }

  private getPasswordResetMaxAgeMs(): number {
    const passwordResetExpiresIn = this.configService.getOrThrow<string>(
      'app.passwordResetExpiresIn',
    );
    return parseDurationToMs(passwordResetExpiresIn);
  }

  private signAccessToken(
    userId: string,
    email: string,
    familyId: string,
  ): Promise<string> {
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'app.jwtAccessExpiresIn',
    );

    return this.jwtService.signAsync(
      { sub: userId, username: email, familyId },
      {
        expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'],
      },
    );
  }
}
