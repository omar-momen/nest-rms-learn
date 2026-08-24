import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '@/modules/auth/decorators/public.decorator';
import { PERMISSIONS_KEY } from '@/modules/auth/authorization/require-permissions.decorator';
import {
  hasPermissions,
  Permission,
} from '@/modules/auth/authorization/permissions';
import type { AuthenticatedRequest } from '@/modules/auth/types/jwt-payload.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const classPermissions =
      this.reflector.get<Permission[]>(PERMISSIONS_KEY, context.getClass()) ??
      [];
    const handlerPermissions =
      this.reflector.get<Permission[]>(PERMISSIONS_KEY, context.getHandler()) ??
      [];
    const required = [...new Set([...classPermissions, ...handlerPermissions])];
    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;
    if (!role || !hasPermissions(role, required)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
