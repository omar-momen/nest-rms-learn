import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerGetTrackerFunction } from '@nestjs/throttler';

import { normalizeEmail } from '@/utils/email.util';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requestIp(request: Record<string, unknown>): string {
  return typeof request.ip === 'string' ? request.ip : 'unknown';
}

function emailFromRequest(
  request: Record<string, unknown>,
): string | undefined {
  const body: unknown = request.body;

  if (isRecord(body) && typeof body.email === 'string' && body.email.trim()) {
    return normalizeEmail(body.email);
  }

  return undefined;
}

export const getIpRateLimitTracker: ThrottlerGetTrackerFunction = (request) =>
  requestIp(request);

export const getEmailRateLimitTracker: ThrottlerGetTrackerFunction = (
  request,
) => emailFromRequest(request) ?? `missing-email:${requestIp(request)}`;

/** Email throttler only applies when the request body includes an email. */
export function skipEmailRateLimitWhenMissing(
  context: ExecutionContext,
): boolean {
  const request: unknown = context.switchToHttp().getRequest();
  return !isRecord(request) || emailFromRequest(request) === undefined;
}
