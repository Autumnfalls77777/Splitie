import * as Crypto from 'expo-crypto';

export function createId(prefix = 'id'): string {
  try {
    return `${prefix}_${Crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
