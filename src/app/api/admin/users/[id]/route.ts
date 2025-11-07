/**
 * Admin User Details API
 * GET /api/admin/users/[id] - Get user details
 * PATCH /api/admin/users/[id] - Update user
 * DELETE /api/admin/users/[id] - Delete user
 *
 * Individual user management
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserDetails,
  updateUserRole,
  deactivateUser,
  deleteUserPermanently,
  getUserActivity,
} from '@/lib/admin/user-management';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    // TODO: Add admin authentication
    const { id: userId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get('include');

    const user = await getUserDetails(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Optionally include activity data
    if (include === 'activity') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const activity = await getUserActivity(userId, limit);
      return NextResponse.json({ user, activity });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    // TODO: Add admin authentication
    const { id: userId } = await context.params;
    const body = await request.json();

    // Update user role
    if (body.role) {
      await updateUserRole(userId, body.role);
    }

    // Get updated user details
    const user = await getUserDetails(userId);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  try {
    // TODO: Add admin authentication
    const { id: userId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      await deleteUserPermanently(userId);
    } else {
      await deactivateUser(userId);
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'User permanently deleted' : 'User deactivated',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
