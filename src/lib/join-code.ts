/**
 * Trip join codes.
 *
 * The server is authoritative and uses the same alphabet (`A-HJ-NP-Z`), so
 * codes never contain the easily confused letters I and O. This module is the
 * client-side validator and a generator used by tests/tools; the database
 * trigger generates the code that is actually stored.
 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_PATTERN = /^[A-HJ-NP-Z]{6}$/;

/** Uppercase letters only. I/O are kept so the user gets a clear validation error. */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, JOIN_CODE_LENGTH);
}

export function isValidJoinCode(code: string): boolean {
  return JOIN_CODE_PATTERN.test(code);
}

/**
 * Generates a candidate code. `isTaken` is checked after each candidate so the
 * caller can retry on a collision (the database has a unique index).
 */
export function generateJoinCode(
  isTaken: (code: string) => boolean = () => false,
  random: () => number = Math.random,
  maxAttempts = 24,
): string {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let code = '';
    for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
      const roll = Math.min(
        JOIN_CODE_ALPHABET.length - 1,
        Math.max(0, Math.floor(random() * JOIN_CODE_ALPHABET.length)),
      );
      code += JOIN_CODE_ALPHABET[roll];
    }
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not generate a unique join code.');
}
