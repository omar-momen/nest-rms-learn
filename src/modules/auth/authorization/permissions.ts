import { UserRole } from '@generated/prisma/enums';

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

  /** Admin-only: list/manage accounts (incl. role). */
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
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
  [UserRole.CUSTOMER]: [Permission.APP_ACCESS],
  [UserRole.STAFF]: STAFF_PERMISSIONS,
  [UserRole.ADMIN]: Object.values(Permission),
};

export function hasPermissions(
  role: UserRole,
  required: Permission[],
): boolean {
  const granted = new Set(ROLE_PERMISSIONS[role] ?? []);
  return required.every((permission) => granted.has(permission));
}
