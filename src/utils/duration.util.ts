const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses durations like `15m`, `1h`, `7d` into milliseconds.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(duration.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${duration}". Use formats like 1s 15m, 1h, 7d.`,
    );
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  return value * UNIT_MS[unit];
}
