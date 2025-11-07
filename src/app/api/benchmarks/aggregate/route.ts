/**
 * Benchmark Aggregation API
 * POST /api/benchmarks/aggregate
 *
 * Trigger benchmark aggregation for all segments
 * This is an administrative endpoint that should be run periodically
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  aggregateAllBenchmarks,
  aggregateBenchmarksForSegment,
} from '@/lib/benchmarks/benchmark-aggregation';

export const dynamic = 'force-dynamic';

interface AggregateRequest {
  industry?: string;
  size?: string;
  region?: string;
  createSnapshots?: boolean;
  aggregateAll?: boolean;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: AggregateRequest = await request.json();

    // TODO: Add authentication check here - only allow admins
    // const session = await getSession(request);
    // if (!session || session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    if (body.aggregateAll) {
      // Aggregate all segments
      console.log('🔄 Starting full benchmark aggregation...');
      const startTime = Date.now();

      await aggregateAllBenchmarks(body.createSnapshots || false);

      const duration = Date.now() - startTime;
      console.log(`✅ Aggregation complete in ${duration}ms`);

      return NextResponse.json({
        success: true,
        message: 'All benchmarks aggregated successfully',
        duration,
      });
    } else if (body.industry && body.size) {
      // Aggregate specific segment
      console.log(
        `🔄 Aggregating benchmarks for ${body.industry}/${body.size}/${body.region || 'all'}`
      );
      const startTime = Date.now();

      const result = await aggregateBenchmarksForSegment(
        body.industry,
        body.size,
        body.region,
        body.createSnapshots || false
      );

      const duration = Date.now() - startTime;

      if (result.domainBenchmarks.length === 0) {
        return NextResponse.json(
          {
            error: 'No finalized assessments found for this segment',
            industry: body.industry,
            size: body.size,
            region: body.region,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Segment benchmarks aggregated successfully',
        duration,
        industry: body.industry,
        size: body.size,
        region: body.region,
        domainCount: result.domainBenchmarks.length,
        itemCount: result.itemBenchmarks.length,
        sampleSize: result.domainBenchmarks[0]?.sampleSize || 0,
      });
    } else {
      return NextResponse.json(
        {
          error:
            'Either aggregateAll must be true, or industry and size must be provided',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error aggregating benchmarks:', error);
    return NextResponse.json(
      {
        error: 'Failed to aggregate benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
