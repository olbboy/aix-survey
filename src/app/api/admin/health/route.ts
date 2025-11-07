/**
 * Admin System Health API
 * GET /api/admin/health - Get system health status
 *
 * Monitor system health and performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { performHealthCheck } from '@/lib/admin/platform-analytics';
import {
  getDatabaseMetrics,
  getSystemResources,
  getActiveAlerts,
  checkSystemHealth,
} from '@/lib/admin/system-monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // TODO: Add admin authentication
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (type === 'database') {
      const dbMetrics = await getDatabaseMetrics();
      return NextResponse.json({ database: dbMetrics });
    }

    if (type === 'resources') {
      const resources = await getSystemResources();
      return NextResponse.json({ resources });
    }

    if (type === 'alerts') {
      const level = searchParams.get('level') as any;
      const category = searchParams.get('category') as any;
      const alerts = await getActiveAlerts({ level, category });
      return NextResponse.json({ alerts });
    }

    if (type === 'check') {
      // Run system health checks and create alerts if needed
      const alerts = await checkSystemHealth();
      return NextResponse.json({ alerts });
    }

    // Return comprehensive health data
    const [healthCheck, dbMetrics, resources, alerts] = await Promise.all([
      performHealthCheck(),
      getDatabaseMetrics(),
      getSystemResources(),
      getActiveAlerts(),
    ]);

    return NextResponse.json({
      health: healthCheck,
      database: dbMetrics,
      resources,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching health status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch health status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
