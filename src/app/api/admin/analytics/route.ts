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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // TODO: Add admin authentication check here
    // const session = await getServerSession();
    // if (!session || session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

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

    return NextResponse.json({
      statistics,
      usage,
      performance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
