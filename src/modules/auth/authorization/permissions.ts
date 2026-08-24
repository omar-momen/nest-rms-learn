import type { UserRole } from '@/modules/auth/types/user-role';

export enum Permission {
  APP_ACCESS = 'app:access',
  DASHBOARD_ACCESS = 'dashboard:access',

  PRODUCTS_WRITE = 'products:write',
  CATEGORIES_WRITE = 'categories:write',
  BRANCHES_WRITE = 'branches:write',
  COUPONS_WRITE = 'coupons:write',

  INVENTORY_READ = 'inventory:read',
  INVENTORY_ADJUST = 'inventory:adjust',

  ORDERS_MANAGE = 'orders:manage',
}

const STAFF_PERMISSIONS: Permission[] = [
  Permission.APP_ACCESS,
  Permission.DASHBOARD_ACCESS,
  Permission.PRODUCTS_WRITE,
  Permission.CATEGORIES_WRITE,
  Permission.BRANCHES_WRITE,
  Permission.COUPONS_WRITE,
  Permission.INVENTORY_READ,
  Permission.INVENTORY_ADJUST,
  Permission.ORDERS_MANAGE,
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CUSTOMER: [Permission.APP_ACCESS],
  STAFF: STAFF_PERMISSIONS,
  ADMIN: Object.values(Permission),
};

export function hasPermissions(
  role: UserRole,
  required: Permission[],
): boolean {
  const granted = new Set(ROLE_PERMISSIONS[role] ?? []);
  return required.every((permission) => granted.has(permission));
}
