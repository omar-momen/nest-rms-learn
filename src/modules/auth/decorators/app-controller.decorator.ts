import { applyDecorators, Controller } from '@nestjs/common';

import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';

export const APP_ROUTE_PREFIX = 'app';

export function AppController(path: string): ClassDecorator {
  return applyDecorators(
    Controller(`${APP_ROUTE_PREFIX}/${path}`),
    RequirePermissions(Permission.APP_ACCESS),
  );
}
