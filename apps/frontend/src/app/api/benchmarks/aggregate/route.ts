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
import { verifyAdminInRoute } from '@/lib/auth/middleware-helpers';
import { log } from '@/lib/utils/logger';

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

    // FIXED: Add admin authentication check
    const authResult = await verifyAdminInRoute(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    if (body.aggregateAll) {
      // Aggregate all segments
      log.info('Admin starting full benchmark aggregation', {
        adminId: authResult.user.id,
        createSnapshots: body.createSnapshots,
      });
      const startTime = Date.now();

      await aggregateAllBenchmarks(body.createSnapshots || false);

      const duration = Date.now() - startTime;
      log.info('Benchmark aggregation complete', {
        adminId: authResult.user.id,
        type: 'full',
        duration,
      });

      return NextResponse.json({
        success: true,
        message: 'All benchmarks aggregated successfully',
        duration,
      });
    } else if (body.industry && body.size) {
      // Aggregate specific segment
      log.info('Admin aggregating segment benchmarks', {
        adminId: authResult.user.id,
        industry: body.industry,
        size: body.size,
        region: body.region,
      });
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

      log.info('Segment benchmark aggregation complete', {
        adminId: authResult.user.id,
        industry: body.industry,
        size: body.size,
        duration,
        domainCount: result.domainBenchmarks.length,
      });

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
    log.error('Error aggregating benchmarks', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to aggregate benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
