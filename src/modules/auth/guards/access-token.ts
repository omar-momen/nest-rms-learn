import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { AuthService } from '@/modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorator';
import type {
  AuthenticatedRequest,
  JwtPayload,
} from '@/modules/auth/types/jwt-payload.type';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token);
      if (
        !payload?.sub ||
        typeof payload.sub !== 'string' ||
        !payload.familyId ||
        typeof payload.familyId !== 'string'
      ) {
        throw new UnauthorizedException('Invalid token');
      }

      const { role } = await this.authService.assertActiveAccessSession(
        payload.sub,
        payload.familyId,
      );

      request.user = { ...payload, role };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
