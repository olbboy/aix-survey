/**
 * Organization Progress API
 * GET /api/organizations/[id]/progress
 *
 * Get complete progress tracking data for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizationProgress,
  getDomainProgress,
  getAchievementSummary,
} from '@/lib/progress/progress-tracking';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: organizationId } = await context.params;

    // Get all progress data
    const [progress, domainProgress, achievements] = await Promise.all([
      getOrganizationProgress(organizationId),
      getDomainProgress(organizationId),
      getAchievementSummary(organizationId),
    ]);

    if (!progress) {
      return NextResponse.json(
        {
          error: 'No progress data found for this organization',
          message: 'The organization needs at least one finalized assessment to track progress.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      progress,
      domainProgress,
      achievements,
    });
  } catch (error) {
    console.error('Error fetching organization progress:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch progress data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
