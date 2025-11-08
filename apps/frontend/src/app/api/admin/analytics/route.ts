/**
 * Admin Analytics API
 * GET /api/admin/analytics
 *
 * Get comprehensive platform analytics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPlatformStatistics,
  getUsageMetrics,
  getPerformanceMetrics,
} from '@/lib/admin/platform-analytics';
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
    const type = searchParams.get('type') || 'all';
    const days = parseInt(searchParams.get('days') || '30');

    // Return different data based on type parameter
    if (type === 'statistics') {
      const statistics = await getPlatformStatistics();
      return NextResponse.json({ statistics });
    }

    if (type === 'usage') {
      const usage = await getUsageMetrics(days);
      return NextResponse.json({ usage });
    }

    if (type === 'performance') {
      const performance = await getPerformanceMetrics();
      return NextResponse.json({ performance });
    }

    // Return all data by default
    const [statistics, usage, performance] = await Promise.all([
      getPlatformStatistics(),
      getUsageMetrics(days),
      getPerformanceMetrics(),
    ]);

    log.info('Admin fetched platform analytics', {
      adminId: authResult.user.id,
      type,
      days,
    });

    return NextResponse.json({
      statistics,
      usage,
      performance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('Error fetching analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
