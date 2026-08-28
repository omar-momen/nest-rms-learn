import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/** Floor for new passwords (register / password change / reset). */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * bcrypt only uses the first 72 bytes; longer inputs waste CPU and do not
 * add security. Enforce the same ceiling on login to limit DoS.
 */
export const PASSWORD_MAX_LENGTH = 72;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
