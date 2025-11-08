/**
 * Input Validation Schemas
 * Zod schemas for API input validation and sanitization
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const cuidSchema = z.string().cuid('Invalid ID format');

export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Assessment Schemas
 */
export const AssessmentCreateSchema = z.object({
  templateId: z.string().cuid('Invalid template ID'),
  organizationId: z.string().cuid('Invalid organization ID').optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
});

export const AssessmentUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim().optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'FINALIZED']).optional(),
});

/**
 * Response Schemas
 */
export const ResponseItemSchema = z.object({
  score: z
    .union([z.number().int().min(1).max(5), z.null()])
    .optional(),
  currentState: z.string().max(5000, 'Current state too long').trim().optional(),
  desiredState: z.string().max(5000, 'Desired state too long').trim().optional(),
});

export const ResponsesSchema = z.record(
  z.string().cuid('Invalid item ID'),
  ResponseItemSchema
);

export const SaveResponsesBodySchema = z.object({
  responses: ResponsesSchema,
});

/**
 * User Schemas
 */
export const UserCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'REVIEWER', 'RESPONDENT', 'VIEWER']).optional(),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim().optional(),
  email: emailSchema.optional(),
  role: z.enum(['OWNER', 'ADMIN', 'REVIEWER', 'RESPONDENT', 'VIEWER']).optional(),
  password: passwordSchema.optional(),
});

/**
 * Authentication Schemas
 */
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
});

/**
 * Organization Schemas
 */
export const OrganizationCreateSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Name too long').trim(),
  description: z.string().max(1000, 'Description too long').trim().optional(),
  industry: z.string().max(100, 'Industry too long').trim().optional(),
});

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200, 'Name too long').trim().optional(),
  description: z.string().max(1000, 'Description too long').trim().optional(),
  industry: z.string().max(100, 'Industry too long').trim().optional(),
});

/**
 * Query Parameter Schemas
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const IdParamSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

/**
 * Evidence/File Upload Schemas
 */
export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  fileType: z.string().min(1, 'File type is required'),
});

/**
 * Utility function to validate and sanitize input
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Utility function for safe parsing (doesn't throw)
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errorMessage = result.error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join(', ');

  return { success: false, error: errorMessage };
}
