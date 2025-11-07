/**
 * Benchmark Trends API
 * GET /api/benchmarks/trends?industry={industry}&size={size}&region={region}&months={months}
 *
 * Get historical benchmark trends for a specific segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalTrends } from '@/lib/benchmarks/benchmark-comparison';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');
    const size = searchParams.get('size');
    const region = searchParams.get('region') || undefined;
    const months = parseInt(searchParams.get('months') || '12', 10);

    // Validate required parameters
    if (!industry || !size) {
      return NextResponse.json(
        { error: 'industry and size parameters are required' },
        { status: 400 }
      );
    }

    // Validate months parameter
    if (months < 1 || months > 60) {
      return NextResponse.json(
        { error: 'months parameter must be between 1 and 60' },
        { status: 400 }
      );
    }

    // Fetch historical trends
    const trends = await getHistoricalTrends(industry, size, region, months);

    return NextResponse.json({
      industry,
      size,
      region,
      months,
      snapshots: trends,
    });
  } catch (error) {
    console.error('Error fetching benchmark trends:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch benchmark trends',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
