/**
 * Benchmarks API
 * GET /api/benchmarks?industry={industry}&size={size}&region={region}
 *
 * Get benchmark data for a specific industry/size segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBenchmarkData } from '@/lib/benchmarks/benchmark-comparison';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');
    const size = searchParams.get('size');
    const region = searchParams.get('region') || undefined;

    // Validate required parameters
    if (!industry || !size) {
      return NextResponse.json(
        { error: 'industry and size parameters are required' },
        { status: 400 }
      );
    }

    // Fetch benchmark data
    const benchmarkData = await getBenchmarkData(industry, size, region);

    if (!benchmarkData) {
      return NextResponse.json(
        {
          error: 'No benchmark data found for this segment',
          message:
            'Benchmark data may not be available yet for this industry/size combination. Please try again later or check if there are enough finalized assessments in this segment.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(benchmarkData);
  } catch (error) {
    console.error('Error fetching benchmark data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch benchmark data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
