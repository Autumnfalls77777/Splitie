const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/** Invites are stored and compared lowercase, matching the database RPC. */
export function normalizeInviteEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidInviteEmail(input: string): boolean {
  const email = normalizeInviteEmail(input);
  return email.length > 0 && email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}
