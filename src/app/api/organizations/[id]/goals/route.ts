/**
 * Organization Goals API
 * GET /api/organizations/[id]/goals - List all goals
 * POST /api/organizations/[id]/goals - Create new goal
 *
 * Manage progress goals for an organization
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createGoal,
  getOrganizationGoals,
  getGoalStatistics,
  type CreateGoalRequest,
  type GoalStatus,
  type GoalPriority,
  type GoalType,
} from '@/lib/progress/goal-management';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: organizationId } = await context.params;
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const status = searchParams.get('status') as GoalStatus | null;
    const priority = searchParams.get('priority') as GoalPriority | null;
    const goalType = searchParams.get('goalType') as GoalType | null;
    const includeStats = searchParams.get('includeStats') === 'true';

    // Fetch goals
    const goals = await getOrganizationGoals(organizationId, {
      ...(status && { status }),
      ...(priority && { priority }),
      ...(goalType && { goalType }),
    });

    // Fetch statistics if requested
    let statistics;
    if (includeStats) {
      statistics = await getGoalStatistics(organizationId);
    }

    return NextResponse.json({
      goals,
      ...(statistics && { statistics }),
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch goals',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: organizationId } = await context.params;
    const body: CreateGoalRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.targetValue || !body.targetDate) {
      return NextResponse.json(
        { error: 'title, targetValue, and targetDate are required' },
        { status: 400 }
      );
    }

    // Validate goal type specific fields
    if (body.goalType === 'DOMAIN_SCORE' && !body.domainCode) {
      return NextResponse.json(
        { error: 'domainCode is required for DOMAIN_SCORE goals' },
        { status: 400 }
      );
    }

    if (body.goalType === 'ITEM_SCORE' && !body.itemCode) {
      return NextResponse.json(
        { error: 'itemCode is required for ITEM_SCORE goals' },
        { status: 400 }
      );
    }

    // Create goal
    const goal = await createGoal({
      ...body,
      organizationId,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      {
        error: 'Failed to create goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
