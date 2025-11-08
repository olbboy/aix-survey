/**
 * Admin Audit Logs API
 * GET /api/admin/audit-logs - Get audit logs with filtering
 *
 * Access audit trail for compliance and security
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuditLogs,
  getAuditLogStatistics,
  type AuditLogFilters,
  type AuditAction,
} from '@/lib/admin/system-monitoring';
import { verifyAdminInRoute } from '@/lib/auth/middleware-helpers';
import { log } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // FIXED: Add admin authentication check
    const authResult = await verifyAdminInRoute(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const searchParams = request.nextUrl.searchParams;

    // Check for statistics query
    if (searchParams.get('type') === 'statistics') {
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined;
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined;

      const statistics = await getAuditLogStatistics(startDate, endDate);
      return NextResponse.json({ statistics });
    }

    // Standard audit log query with filters
    const filters: AuditLogFilters = {};

    if (searchParams.get('action')) {
      filters.action = searchParams.get('action') as AuditAction;
    }

    if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId')!;
    }

    if (searchParams.get('organizationId')) {
      filters.organizationId = searchParams.get('organizationId')!;
    }

    if (searchParams.get('resourceType')) {
      filters.resourceType = searchParams.get('resourceType')!;
    }

    if (searchParams.get('success')) {
      filters.success = searchParams.get('success') === 'true';
    }

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }

    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    if (searchParams.get('search')) {
      filters.searchQuery = searchParams.get('search')!;
    }

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const result = await getAuditLogs(filters, { page, pageSize });

    log.info('Admin fetched audit logs', {
      adminId: authResult.user.id,
      filters,
      resultCount: result.logs?.length || 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Error fetching audit logs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch audit logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
