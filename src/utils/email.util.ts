/** Canonical email form for lookups and persistence (case-insensitive uniqueness). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
