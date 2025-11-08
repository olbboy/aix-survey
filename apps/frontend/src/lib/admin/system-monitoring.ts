/**
 * System Monitoring Service
 * Audit logs, error tracking, and system health monitoring
 *
 * Phase 5C: Admin Dashboard
 */

import { prisma } from '@/lib/db/prisma';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ORGANIZATION_CREATED'
  | 'ORGANIZATION_UPDATED'
  | 'ORGANIZATION_DELETED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_UPDATED'
  | 'ASSESSMENT_FINALIZED'
  | 'ASSESSMENT_DELETED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'EXPORT_PDF'
  | 'EXPORT_CSV'
  | 'BENCHMARK_COMPARED'
  | 'GOAL_CREATED'
  | 'GOAL_ACHIEVED'
  | 'SETTINGS_UPDATED';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: AuditAction;
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  organizationName?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

export interface SystemAlert {
  id: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'PERFORMANCE' | 'SECURITY' | 'DATA' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export interface DatabaseMetrics {
  // Connection pool
  connectionPool: {
    total: number;
    idle: number;
    active: number;
    waiting: number;
  };

  // Table sizes
  tableSizes: Array<{
    tableName: string;
    rowCount: number;
    totalSize: string;
    indexSize: string;
  }>;

  // Query performance
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;

  // Database health
  health: {
    status: 'healthy' | 'degraded' | 'critical';
    responseTime: number;
    uptime: number;
  };
}

export interface SystemResourceMetrics {
  cpu: {
    usage: number; // Percentage
    loadAverage: number[];
  };
  memory: {
    total: number; // Bytes
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  timestamp: Date;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: {
  action: AuditAction;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}): Promise<void> {
  // Get user and organization names if IDs provided
  let userName: string | undefined;
  let userEmail: string | undefined;
  let organizationName: string | undefined;

  if (entry.userId) {
    const user = await prisma.user.findUnique({
      where: { id: entry.userId },
      select: { name: true, email: true },
    });
    if (user) {
      userName = user.name || undefined;
      userEmail = user.email;
    }
  }

  if (entry.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: entry.organizationId },
      select: { name: true },
    });
    if (org) {
      organizationName = org.name;
    }
  }

  await prisma.auditLog.create({
    data: {
      action: entry.action,
      userId: entry.userId,
      userName,
      userEmail,
      organizationId: entry.organizationId,
      organizationName,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details || {},
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success ?? true,
      errorMessage: entry.errorMessage,
    },
  });
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {},
  pagination: { page?: number; pageSize?: number } = {}
): Promise<{
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 50;
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = {};

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.organizationId) {
    where.organizationId = filters.organizationId;
  }

  if (filters.resourceType) {
    where.resourceType = filters.resourceType;
  }

  if (filters.success !== undefined) {
    where.success = filters.success;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  if (filters.searchQuery) {
    where.OR = [
      { userName: { contains: filters.searchQuery, mode: 'insensitive' } },
      { userEmail: { contains: filters.searchQuery, mode: 'insensitive' } },
      { organizationName: { contains: filters.searchQuery, mode: 'insensitive' } },
      { resourceId: { contains: filters.searchQuery, mode: 'insensitive' } },
    ];
  }

  // Get logs and total count in parallel
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    logs: logs.map((log: any) => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action as AuditAction,
      userId: log.userId,
      userName: log.userName,
      userEmail: log.userEmail,
      organizationId: log.organizationId,
      organizationName: log.organizationName,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details as Record<string, any>,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      success: log.success,
      errorMessage: log.errorMessage,
    })),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  uniqueUsers: number;
  topActions: Array<{ action: AuditAction; count: number }>;
  activityByHour: Array<{ hour: number; count: number }>;
  activityByDay: Array<{ date: string; count: number }>;
}> {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const [totalEvents, successfulEvents, failedEvents, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, success: true } }),
    prisma.auditLog.count({ where: { ...where, success: false } }),
    prisma.auditLog.findMany({
      where,
      select: {
        action: true,
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  // Count unique users
  const uniqueUserIds = new Set(
    logs.filter((log: any) => log.userId).map((log: any) => log.userId)
  );
  const uniqueUsers = uniqueUserIds.size;

  // Top actions
  const actionCounts = new Map<string, number>();
  logs.forEach((log: any) => {
    const count = actionCounts.get(log.action) || 0;
    actionCounts.set(log.action, count + 1);
  });

  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action: action as AuditAction, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Activity by hour (last 24 hours if no date range specified)
  const hourCounts = new Map<number, number>();
  logs.forEach((log: any) => {
    const hour = new Date(log.createdAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  const activityByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourCounts.get(hour) || 0,
  }));

  // Activity by day
  const dayCounts = new Map<string, number>();
  logs.forEach((log: any) => {
    const date = new Date(log.createdAt).toISOString().split('T')[0];
    dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
  });

  const activityByDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalEvents,
    successfulEvents,
    failedEvents,
    uniqueUsers,
    topActions,
    activityByHour,
    activityByDay,
  };
}

/**
 * Delete old audit logs (data retention)
 */
export async function cleanupOldAuditLogs(olderThanDays: number = 90): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

/**
 * Log an application error
 */
export async function logError(error: {
  type: string;
  message: string;
  stack?: string;
  userId?: string;
  organizationId?: string;
  requestUrl?: string;
  requestMethod?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  await prisma.errorLog.create({
    data: {
      type: error.type,
      message: error.message,
      stack: error.stack,
      userId: error.userId,
      organizationId: error.organizationId,
      requestUrl: error.requestUrl,
      requestMethod: error.requestMethod,
      statusCode: error.statusCode,
      metadata: error.metadata || {},
    },
  });
}

/**
 * Get recent errors
 */
export async function getRecentErrors(
  limit: number = 50,
  filters?: {
    type?: string;
    userId?: string;
    statusCode?: number;
    startDate?: Date;
  }
): Promise<Array<{
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  userId?: string;
  requestUrl?: string;
  statusCode?: number;
  count: number; // Number of occurrences of same error
}>> {
  const where: any = {};

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.statusCode) {
    where.statusCode = filters.statusCode;
  }

  if (filters?.startDate) {
    where.createdAt = { gte: filters.startDate };
  }

  const errors = await prisma.errorLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  // Group similar errors
  const errorMap = new Map<string, any>();

  errors.forEach((error: any) => {
    // Use message + type as key for grouping
    const key = `${error.type}:${error.message}`;

    if (errorMap.has(key)) {
      const existing = errorMap.get(key);
      existing.count++;
      // Keep the most recent timestamp
      if (error.createdAt > existing.timestamp) {
        existing.timestamp = error.createdAt;
      }
    } else {
      errorMap.set(key, {
        id: error.id,
        timestamp: error.createdAt,
        type: error.type,
        message: error.message,
        stack: error.stack,
        userId: error.userId,
        requestUrl: error.requestUrl,
        statusCode: error.statusCode,
        count: 1,
      });
    }
  });

  return Array.from(errorMap.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

/**
 * Get error statistics
 */
export async function getErrorStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalErrors: number;
  errorRate: number; // Errors per hour
  errorsByType: Array<{ type: string; count: number }>;
  errorsByStatusCode: Array<{ statusCode: number; count: number }>;
  topErrorMessages: Array<{ message: string; count: number }>;
}> {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const errors = await prisma.errorLog.findMany({
    where,
    select: {
      type: true,
      statusCode: true,
      message: true,
      createdAt: true,
    },
  });

  const totalErrors = errors.length;

  // Calculate error rate (errors per hour)
  const timeRange = endDate && startDate
    ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
    : 24; // Default to 24 hours
  const errorRate = totalErrors / timeRange;

  // Group by type
  const typeCounts = new Map<string, number>();
  errors.forEach((error: any) => {
    typeCounts.set(error.type, (typeCounts.get(error.type) || 0) + 1);
  });

  const errorsByType = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Group by status code
  const statusCounts = new Map<number, number>();
  errors.forEach((error: any) => {
    if (error.statusCode) {
      statusCounts.set(error.statusCode, (statusCounts.get(error.statusCode) || 0) + 1);
    }
  });

  const errorsByStatusCode = Array.from(statusCounts.entries())
    .map(([statusCode, count]) => ({ statusCode, count }))
    .sort((a, b) => b.count - a.count);

  // Top error messages
  const messageCounts = new Map<string, number>();
  errors.forEach((error: any) => {
    messageCounts.set(error.message, (messageCounts.get(error.message) || 0) + 1);
  });

  const topErrorMessages = Array.from(messageCounts.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalErrors,
    errorRate,
    errorsByType,
    errorsByStatusCode,
    topErrorMessages,
  };
}

/**
 * Clean up old error logs
 */
export async function cleanupOldErrorLogs(olderThanDays: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await prisma.errorLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

// ============================================================================
// SYSTEM ALERTS
// ============================================================================

/**
 * Create a system alert
 */
export async function createSystemAlert(alert: {
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'PERFORMANCE' | 'SECURITY' | 'DATA' | 'SYSTEM';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<SystemAlert> {
  const created = await prisma.systemAlert.create({
    data: {
      level: alert.level,
      category: alert.category,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata || {},
      resolved: false,
    },
  });

  return {
    id: created.id,
    level: created.level as any,
    category: created.category as any,
    title: created.title,
    message: created.message,
    timestamp: created.createdAt,
    resolved: created.resolved,
    resolvedAt: created.resolvedAt || undefined,
    resolvedBy: created.resolvedBy || undefined,
    metadata: created.metadata as Record<string, any>,
  };
}

/**
 * Get active system alerts
 */
export async function getActiveAlerts(
  filters?: {
    level?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category?: 'PERFORMANCE' | 'SECURITY' | 'DATA' | 'SYSTEM';
  }
): Promise<SystemAlert[]> {
  const where: any = {
    resolved: false,
  };

  if (filters?.level) {
    where.level = filters.level;
  }

  if (filters?.category) {
    where.category = filters.category;
  }

  const alerts = await prisma.systemAlert.findMany({
    where,
    orderBy: [
      { level: 'desc' }, // CRITICAL first
      { createdAt: 'desc' },
    ],
  });

  return alerts.map((alert: any) => ({
    id: alert.id,
    level: alert.level,
    category: alert.category,
    title: alert.title,
    message: alert.message,
    timestamp: alert.createdAt,
    resolved: alert.resolved,
    resolvedAt: alert.resolvedAt || undefined,
    resolvedBy: alert.resolvedBy || undefined,
    metadata: alert.metadata as Record<string, any>,
  }));
}

/**
 * Resolve a system alert
 */
export async function resolveSystemAlert(
  alertId: string,
  resolvedBy: string
): Promise<void> {
  await prisma.systemAlert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    },
  });
}

/**
 * Auto-check and create alerts for common issues
 */
export async function checkSystemHealth(): Promise<SystemAlert[]> {
  const alerts: SystemAlert[] = [];

  // Check 1: High error rate
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentErrors = await prisma.errorLog.count({
    where: { createdAt: { gte: last24Hours } },
  });

  if (recentErrors > 100) {
    alerts.push(
      await createSystemAlert({
        level: 'ERROR',
        category: 'SYSTEM',
        title: 'High Error Rate',
        message: `${recentErrors} errors logged in the last 24 hours`,
        metadata: { errorCount: recentErrors },
      })
    );
  }

  // Check 2: Database size
  const assessmentCount = await prisma.assessment.count();
  if (assessmentCount > 100000) {
    alerts.push(
      await createSystemAlert({
        level: 'WARNING',
        category: 'DATA',
        title: 'Large Database Size',
        message: `Database contains ${assessmentCount.toLocaleString()} assessments. Consider archiving old data.`,
        metadata: { assessmentCount },
      })
    );
  }

  // Check 3: Inactive users
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const inactiveUsers = await prisma.user.count({
    where: {
      OR: [
        { lastLoginAt: { lt: thirtyDaysAgo } },
        { lastLoginAt: null },
      ],
    },
  });

  if (inactiveUsers > 50) {
    alerts.push(
      await createSystemAlert({
        level: 'INFO',
        category: 'DATA',
        title: 'Many Inactive Users',
        message: `${inactiveUsers} users haven't logged in for 30+ days`,
        metadata: { inactiveUserCount: inactiveUsers },
      })
    );
  }

  return alerts;
}

// ============================================================================
// DATABASE METRICS
// ============================================================================

/**
 * Get database performance metrics
 */
export async function getDatabaseMetrics(): Promise<Partial<DatabaseMetrics>> {
  // Test database connectivity and response time
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    return {
      health: {
        status: 'critical',
        responseTime: -1,
        uptime: 0,
      },
    };
  }
  const responseTime = Date.now() - start;

  // Get table row counts
  const [
    userCount,
    orgCount,
    assessmentCount,
    responseCount,
    evidenceCount,
    goalCount,
    auditLogCount,
    errorLogCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.assessment.count(),
    prisma.response.count(),
    prisma.evidence.count(),
    prisma.progressGoal.count(),
    prisma.auditLog.count(),
    prisma.errorLog.count(),
  ]);

  const tableSizes = [
    { tableName: 'users', rowCount: userCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'organizations', rowCount: orgCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'assessments', rowCount: assessmentCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'responses', rowCount: responseCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'evidence', rowCount: evidenceCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'goals', rowCount: goalCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'audit_logs', rowCount: auditLogCount, totalSize: 'N/A', indexSize: 'N/A' },
    { tableName: 'error_logs', rowCount: errorLogCount, totalSize: 'N/A', indexSize: 'N/A' },
  ];

  const health = {
    status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'critical',
    responseTime,
    uptime: 0, // Would need external monitoring
  } as const;

  return {
    tableSizes,
    slowQueries: [], // Would need query logging enabled
    health,
  };
}

// ============================================================================
// SYSTEM RESOURCE MONITORING
// ============================================================================

/**
 * Get system resource usage
 * Note: This is a placeholder. Real implementation would use system APIs
 */
export async function getSystemResources(): Promise<Partial<SystemResourceMetrics>> {
  // In a real implementation, you would use Node.js os module or external monitoring
  // For now, return placeholder data
  return {
    timestamp: new Date(),
    // Real values would come from:
    // - os.cpus() and os.loadavg()
    // - os.totalmem() and os.freemem()
    // - File system APIs for disk usage
  };
}
