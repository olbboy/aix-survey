/**
 * Admin Error Logs API
 * GET /api/admin/errors - Get error logs
 * POST /api/admin/errors - Log an error (internal use)
 *
 * Error tracking and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentErrors,
  getErrorStatistics,
  logError,
} from '@/lib/admin/system-monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    // TODO: Add admin authentication
    const searchParams = request.nextUrl.searchParams;

    // Check for statistics query
    if (searchParams.get('type') === 'statistics') {
      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined;
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined;

      const statistics = await getErrorStatistics(startDate, endDate);
      return NextResponse.json({ statistics });
    }

    // Get recent errors with filters
    const limit = parseInt(searchParams.get('limit') || '50');
    const filters: any = {};

    if (searchParams.get('type')) {
      filters.type = searchParams.get('type')!;
    }

    if (searchParams.get('userId')) {
      filters.userId = searchParams.get('userId')!;
    }

    if (searchParams.get('statusCode')) {
      filters.statusCode = parseInt(searchParams.get('statusCode')!);
    }

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }

    const errors = await getRecentErrors(limit, filters);

    return NextResponse.json({ errors });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch error logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // This endpoint can be used internally to log errors
    const body = await request.json();

    await logError({
      type: body.type || 'UNKNOWN',
      message: body.message,
      stack: body.stack,
      userId: body.userId,
      organizationId: body.organizationId,
      requestUrl: body.requestUrl,
      requestMethod: body.requestMethod,
      statusCode: body.statusCode,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging error:', error);
    return NextResponse.json(
      {
        error: 'Failed to log error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
