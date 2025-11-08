/**
 * Goal Progress Check API
 * POST /api/goals/check-progress
 *
 * Check and update goal progress based on latest assessment
 * This should be called automatically when an assessment is finalized
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkGoalProgress } from '@/lib/progress/goal-management';

export const dynamic = 'force-dynamic';

interface CheckProgressRequest {
  organizationId: string;
  assessmentId: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: CheckProgressRequest = await request.json();

    // Validate required fields
    if (!body.organizationId || !body.assessmentId) {
      return NextResponse.json(
        { error: 'organizationId and assessmentId are required' },
        { status: 400 }
      );
    }

    // Check goal progress
    await checkGoalProgress(body.organizationId, body.assessmentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error checking goal progress:', error);
    return NextResponse.json(
      {
        error: 'Failed to check goal progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
