/**
 * Admin Users API
 * GET /api/admin/users - List all users with filtering
 * POST /api/admin/users - Create new user (admin only)
 *
 * Manage platform users
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  listUsers,
  getUserStatistics,
  getMostActiveUsers,
  getInactiveUsers,
  type UserListFilters,
} from '@/lib/admin/user-management';
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

    // Check for special query types
    const queryType = searchParams.get('type');

    if (queryType === 'statistics') {
      const statistics = await getUserStatistics();
      return NextResponse.json({ statistics });
    }

    if (queryType === 'most-active') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const timeframe = (searchParams.get('timeframe') as 'week' | 'month' | 'all') || 'month';
      const activeUsers = await getMostActiveUsers(limit, timeframe);
      return NextResponse.json({ users: activeUsers });
    }

    if (queryType === 'inactive') {
      const days = parseInt(searchParams.get('days') || '90');
      const inactiveUsers = await getInactiveUsers(days);
      return NextResponse.json({ users: inactiveUsers });
    }

    // Standard user list with filters
    const filters: UserListFilters = {};

    if (searchParams.get('role')) {
      filters.role = searchParams.get('role') as any;
    }

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as any;
    }

    if (searchParams.get('organizationId')) {
      filters.organizationId = searchParams.get('organizationId')!;
    }

    if (searchParams.get('search')) {
      filters.searchQuery = searchParams.get('search')!;
    }

    if (searchParams.get('lastLoginAfter')) {
      filters.lastLoginAfter = new Date(searchParams.get('lastLoginAfter')!);
    }

    if (searchParams.get('lastLoginBefore')) {
      filters.lastLoginBefore = new Date(searchParams.get('lastLoginBefore')!);
    }

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const result = await listUsers(filters, { page, pageSize });

    log.info('Admin users list fetched', {
      adminId: authResult.user.id,
      queryType,
      resultCount: result.users?.length || 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Error fetching users', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
