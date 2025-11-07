/**
 * Assessment Benchmark Comparison API
 * GET /api/assessments/[id]/benchmark
 *
 * Compare an assessment against industry benchmarks
 */

import { NextRequest, NextResponse } from 'next/server';
import { compareAssessmentToBenchmarks } from '@/lib/benchmarks/benchmark-comparison';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId } = await context.params;

    // Compare assessment to benchmarks
    const comparison = await compareAssessmentToBenchmarks(assessmentId);

    if (!comparison) {
      return NextResponse.json(
        {
          error:
            'Assessment not found, not finalized, or missing industry/size information',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error comparing assessment to benchmarks:', error);
    return NextResponse.json(
      {
        error: 'Failed to compare assessment to benchmarks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
