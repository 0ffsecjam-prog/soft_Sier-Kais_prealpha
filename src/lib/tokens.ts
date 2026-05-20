import { customAlphabet } from 'nanoid';

// Alfabeto sin caracteres ambiguos (0, O, I, 1, L)
const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const generateToken = customAlphabet(TOKEN_ALPHABET, 8);

export function newAccessCode(): string {
  return generateToken();
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
