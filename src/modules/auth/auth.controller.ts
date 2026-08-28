import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { hours, minutes, SkipThrottle, Throttle } from '@nestjs/throttler';

import type { Request, Response } from 'express';

import { AuthService } from './auth.service';

import { REFRESH_TOKEN_COOKIE } from './constants';

import { Public } from './decorators/public.decorator';

import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';

import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from './utils/refresh-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    default: { limit: 5, ttl: hours(1), blockDuration: hours(1) },
    authEmail: { limit: 3, ttl: hours(1), blockDuration: hours(1) },
  })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceName = this.deviceNameFromRequest(req);

    const result = await this.authService.register(dto, deviceName);

    setRefreshTokenCookie(res, result.refreshToken, result.refreshMaxAgeMs);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Throttle({
    default: { limit: 20, ttl: minutes(15), blockDuration: minutes(15) },
    authEmail: { limit: 5, ttl: minutes(15), blockDuration: minutes(15) },
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceName = this.deviceNameFromRequest(req);

    const result = await this.authService.login(dto, deviceName);

    setRefreshTokenCookie(res, result.refreshToken, result.refreshMaxAgeMs);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Throttle({
    default: { limit: 30, ttl: minutes(1), blockDuration: minutes(1) },
  })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;

    const result = await this.authService.refresh(refreshToken);

    setRefreshTokenCookie(res, result.refreshToken, result.refreshMaxAgeMs);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @SkipThrottle({ default: true, authEmail: true })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;

    const message = await this.authService.logout(refreshToken);

    clearRefreshTokenCookie(res);

    return message;
  }

  @Public()
  @Throttle({
    default: { limit: 5, ttl: hours(1), blockDuration: hours(1) },
    authEmail: { limit: 3, ttl: hours(1), blockDuration: hours(1) },
  })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({
    default: { limit: 10, ttl: minutes(15), blockDuration: minutes(15) },
  })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ===================== PRIVATE METHODS =====================

  private deviceNameFromRequest(req: Request): string | undefined {
    const userAgent = req.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent : undefined;
  }
}
