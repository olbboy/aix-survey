// Validation Utilities

import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function isValidCuid(id: string): boolean {
  // CUID format: c + timestamp + counter + fingerprint + random
  return /^c[a-z0-9]{24}$/.test(id);
}
