/**
 * Sends a password-reset OTP to the user's email.
 *
 * No-op outside production — non-production callers expose `otp` in the API
 * response so the flow can be tested without a mailer.
 */
export async function sendPasswordResetOtp(
  email: string,
  otp: string,
  environment: string | undefined,
): Promise<void> {
  if (environment !== 'production') {
    return;
  }

  await sendPasswordResetOtpEmail(email, otp);
}

/** Production mail hook — wire a provider (SES, SendGrid, Resend, etc.) here. */
async function sendPasswordResetOtpEmail(
  _email: string,
  _otp: string,
): Promise<void> {
  // Intentionally empty until a mail provider is configured.
}
