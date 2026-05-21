import { customAlphabet } from 'nanoid';

// 24 chars, URL-safe. Espacio ~6e36, brute force 24h = imposible incluso sin rate-limit.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz';
const gen = customAlphabet(ALPHABET, 24);

export function newShareToken(): string {
  return gen();
}

export const SHARE_LINK_HOURS = 24;

export function shareLinkExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + SHARE_LINK_HOURS * 60 * 60 * 1000);
}
