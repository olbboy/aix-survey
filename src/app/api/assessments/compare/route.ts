/**
 * Assessment Comparison API
 * GET /api/assessments/compare?from=[fromId]&to=[toId]
 *
 * Compare two assessments side-by-side
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  compareAssessments,
  getSuggestedComparisons,
} from '@/lib/progress/assessment-comparison';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');
    const organizationId = searchParams.get('organizationId');

    // If no IDs provided but organizationId is, return suggested comparisons
    if (!fromId && !toId && organizationId) {
      const suggestions = await getSuggestedComparisons(organizationId);
      return NextResponse.json({ suggestions });
    }

    // Validate parameters
    if (!fromId || !toId) {
      return NextResponse.json(
        { error: 'Both from and to assessment IDs are required' },
        { status: 400 }
      );
    }

    if (fromId === toId) {
      return NextResponse.json(
        { error: 'Cannot compare an assessment with itself' },
        { status: 400 }
      );
    }

    // Compare assessments
    const comparison = await compareAssessments(fromId, toId);

    if (!comparison) {
      return NextResponse.json(
        {
          error: 'Comparison not available',
          message: 'Both assessments must be finalized and use the same template.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error comparing assessments:', error);
    return NextResponse.json(
      {
        error: 'Failed to compare assessments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
