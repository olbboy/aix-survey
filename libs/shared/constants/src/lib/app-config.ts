// Application Configuration Constants

export const APP_CONFIG = {
  name: 'AI Maturity Assessment Platform',
  version: '1.0.0',
  description: 'Enterprise-grade platform for assessing AI maturity',
  supportEmail: 'support@aix-survey.com',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'],
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  autosaveInterval: 5000, // 5 seconds
} as const;

export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    register: '/api/auth/register',
    session: '/api/auth/session',
  },
  assessments: {
    list: '/api/assessments',
    create: '/api/assessments',
    get: (id: string) => `/api/assessments/${id}`,
    update: (id: string) => `/api/assessments/${id}`,
    delete: (id: string) => `/api/assessments/${id}`,
    finalize: (id: string) => `/api/assessments/${id}/finalize`,
    export: (id: string, format: string) => `/api/assessments/${id}/export/${format}`,
    responses: (id: string) => `/api/assessments/${id}/responses`,
  },
  admin: {
    users: '/api/admin/users',
    analytics: '/api/admin/analytics',
    auditLogs: '/api/admin/audit-logs',
    health: '/api/admin/health',
  },
} as const;
