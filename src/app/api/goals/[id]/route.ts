/**
 * Individual Goal API
 * GET /api/goals/[id] - Get goal details
 * PUT /api/goals/[id] - Update goal
 * DELETE /api/goals/[id] - Delete goal
 *
 * Manage individual goals
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getGoal,
  updateGoal,
  deleteGoal,
  markGoalAchieved,
  cancelGoal,
  type UpdateGoalRequest,
} from '@/lib/progress/goal-management';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: goalId } = await context.params;

    const goal = await getGoal(goalId);

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: goalId } = await context.params;
    const body: UpdateGoalRequest & { action?: string; achievedValue?: number } = await request.json();

    // Handle special actions
    if (body.action === 'achieve' && body.achievedValue !== undefined) {
      const goal = await markGoalAchieved(goalId, body.achievedValue);
      return NextResponse.json(goal);
    }

    if (body.action === 'cancel') {
      const goal = await cancelGoal(goalId);
      return NextResponse.json(goal);
    }

    // Regular update
    const { action, achievedValue, ...updates } = body;
    const goal = await updateGoal(goalId, updates);

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      {
        error: 'Failed to update goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: goalId } = await context.params;

    await deleteGoal(goalId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
