/**
 * Application Constants
 */

// Maturity Levels
export const MATURITY_LEVELS = {
  INITIAL: {
    min: 1.0,
    max: 1.5,
    label: 'Sơ khai',
    labelEn: 'Initial',
    color: '#ef4444', // red-500
  },
  BEGINNING: {
    min: 1.6,
    max: 2.5,
    label: 'Khởi đầu',
    labelEn: 'Beginning',
    color: '#f97316', // orange-500
  },
  DEVELOPING: {
    min: 2.6,
    max: 3.5,
    label: 'Phát triển',
    labelEn: 'Developing',
    color: '#eab308', // yellow-500
  },
  MATURE: {
    min: 3.6,
    max: 4.5,
    label: 'Trưởng thành',
    labelEn: 'Mature',
    color: '#22c55e', // green-500
  },
  OPTIMIZED: {
    min: 4.6,
    max: 5.0,
    label: 'Tối ưu',
    labelEn: 'Optimized',
    color: '#3b82f6', // blue-500
  },
} as const;

// Assessment Status
export const ASSESSMENT_STATUS = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_REVIEW: 'PENDING_REVIEW',
  FINALIZED: 'FINALIZED',
} as const;

// User Roles
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  REVIEWER: 'REVIEWER',
  RESPONDENT: 'RESPONDENT',
  VIEWER: 'VIEWER',
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
  MAX_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024,
  ALLOWED_TYPES: (process.env.ALLOWED_FILE_TYPES || 'pdf,docx,xlsx,png,jpg,jpeg').split(','),
  MIME_TYPES: {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  } as Record<string, string>,
} as const;

// Cache TTL (seconds)
export const CACHE_TTL = {
  DRAFT_AUTOSAVE: 300, // 5 minutes
  GUEST_DRAFT: 30 * 24 * 60 * 60, // 30 days
  SESSION: 7 * 24 * 60 * 60, // 7 days
  BENCHMARK: 24 * 60 * 60, // 1 day
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  LOGIN_MAX: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
  LOGIN_WINDOW_MS: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MIN || '15', 10) * 60 * 1000,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Domains
export const DOMAINS = {
  DATA: 'data',
  INFRA: 'infra',
  TECH: 'tech',
  ORG: 'org',
  POLICY: 'policy',
} as const;

// Audit Actions
export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  GUEST_LINKED: 'GUEST_LINKED',
  FINALIZE: 'FINALIZE',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
} as const;
