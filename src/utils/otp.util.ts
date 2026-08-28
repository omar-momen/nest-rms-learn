import { randomInt } from 'node:crypto';

/** Six-digit numeric OTP for password reset. */
export const PASSWORD_RESET_OTP_LENGTH = 6;

export function generatePasswordResetOtp(): string {
  const min = 10 ** (PASSWORD_RESET_OTP_LENGTH - 1);
  const max = 10 ** PASSWORD_RESET_OTP_LENGTH - 1;
  return randomInt(min, max + 1).toString();
}
