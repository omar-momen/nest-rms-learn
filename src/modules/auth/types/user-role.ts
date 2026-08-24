/** Mirrors Prisma `UserRole`. Kept local so request/DTO types do not depend on @ts-nocheck generated enums. */
export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export function toUserRole(role: string): UserRole {
  if (role === 'CUSTOMER' || role === 'STAFF' || role === 'ADMIN') {
    return role;
  }
  throw new Error(`Invalid user role: ${role}`);
}
