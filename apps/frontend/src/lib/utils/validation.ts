/**
 * Validation Utilities
 */

import { FILE_UPLOAD } from './constants';

/**
 * Validate assessment score
 */
export function validateScore(score: number): boolean {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

/**
 * Validate file upload
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  allowedTypes?: string[]
): FileValidationResult {
  // Check file size
  if (file.size > FILE_UPLOAD.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit`,
    };
  }

  // Check file type
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) {
    return {
      valid: false,
      error: 'File has no extension',
    };
  }

  const allowed = allowedTypes || FILE_UPLOAD.ALLOWED_TYPES;
  if (!allowed.includes(extension)) {
    return {
      valid: false,
      error: `File type .${extension} not allowed. Allowed: ${allowed.join(', ')}`,
    };
  }

  // Check MIME type
  const expectedMime = FILE_UPLOAD.MIME_TYPES[extension];
  if (expectedMime && file.type !== expectedMime) {
    return {
      valid: false,
      error: `MIME type mismatch. Expected ${expectedMime}, got ${file.type}`,
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 255);
}

/**
 * Calculate file checksum (SHA-256)
 */
export async function calculateChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
