import { applyDecorators, Controller } from '@nestjs/common';

import { RequirePermissions } from '@/modules/auth/authorization/require-permissions.decorator';
import { Permission } from '@/modules/auth/authorization/permissions';

export const DASHBOARD_ROUTE_PREFIX = 'dashboard';

export function DashboardController(path: string): ClassDecorator {
  return applyDecorators(
    Controller(`${DASHBOARD_ROUTE_PREFIX}/${path}`),
    RequirePermissions(Permission.DASHBOARD_ACCESS),
  );
}
