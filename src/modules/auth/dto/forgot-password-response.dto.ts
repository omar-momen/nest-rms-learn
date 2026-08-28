export class ForgotPasswordResponseDto {
  message: string;
  /** Present only in non-production so the flow can be exercised without a mailer. */
  otp?: string;
}
