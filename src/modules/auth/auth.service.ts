import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { AuthResponseDto, LoginDto, RegisterDto } from './dto';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';

import { parseDurationToMs } from '@/utils/duration.util';
import { normalizeEmail } from '@/utils/email.util';
import { generateRefreshToken, hashToken } from '@/utils/token.util';
import { hashPassword, verifyPassword } from '@/utils/password.util';

type AuthSessionResult = AuthResponseDto & {
  refreshToken: string;
  refreshMaxAgeMs: number;
};

const REGISTRATION_FAILED_MESSAGE =
  'Unable to register with the provided credentials';

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

      return this.issueSession(user.id, user.email, deviceName);
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
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });

    const isPasswordValid =
      user && (await verifyPassword(dto.password, user.password));
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    return this.issueSession(user.id, user.email, deviceName);
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

  /**
   * Revokes active sessions for a user. When `exceptFamilyId` is set, keeps
   * that refresh family (e.g. the device that just changed the password).
   * When omitted, revokes every active session for the user.
   */
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

  /**
   * Access JWTs stay valid until expiry unless the session family is still
   * active. Logout, family revoke, refresh reuse, and user delete all clear
   * that row so the access token fails immediately.
   */
  async assertActiveAccessSession(
    userId: string,
    familyId: string,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: {
        userId,
        familyId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // ================ Private Methods =================

  private async issueSession(
    userId: string,
    email: string,
    deviceName?: string,
  ): Promise<AuthSessionResult> {
    const refreshMaxAgeMs = this.getRefreshMaxAgeMs();
    const familyId = randomUUID();
    const accessToken = await this.signAccessToken(userId, email, familyId);
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
      },
    };
  }

  private getRefreshMaxAgeMs(): number {
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'app.jwtRefreshExpiresIn',
    );
    return parseDurationToMs(refreshExpiresIn);
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
