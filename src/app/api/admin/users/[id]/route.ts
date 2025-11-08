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
import { verifyAdminInRoute } from '@/lib/auth/middleware-helpers';
import { log } from '@/lib/utils/logger';

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
    // FIXED: Add admin authentication check
    const authResult = await verifyAdminInRoute(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

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

      log.info('Admin fetched user details with activity', {
        adminId: authResult.user.id,
        targetUserId: userId,
        activityLimit: limit,
      });

      return NextResponse.json({ user, activity });
    }

    log.info('Admin fetched user details', {
      adminId: authResult.user.id,
      targetUserId: userId,
    });

    return NextResponse.json({ user });
  } catch (error) {
    log.error('Error fetching user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    // FIXED: Add admin authentication check
    const authResult = await verifyAdminInRoute(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id: userId } = await context.params;
    const body = await request.json();

    // Update user role
    if (body.role) {
      await updateUserRole(userId, body.role);

      log.info('Admin updated user role', {
        adminId: authResult.user.id,
        targetUserId: userId,
        newRole: body.role,
      });
    }

    // Get updated user details
    const user = await getUserDetails(userId);

    return NextResponse.json({ user });
  } catch (error) {
    log.error('Error updating user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    // FIXED: Add admin authentication check
    const authResult = await verifyAdminInRoute(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id: userId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      await deleteUserPermanently(userId);

      log.warn('Admin permanently deleted user', {
        adminId: authResult.user.id,
        targetUserId: userId,
        action: 'PERMANENT_DELETE',
      });
    } else {
      await deactivateUser(userId);

      log.info('Admin deactivated user', {
        adminId: authResult.user.id,
        targetUserId: userId,
        action: 'DEACTIVATE',
      });
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'User permanently deleted' : 'User deactivated',
    });
  } catch (error) {
    log.error('Error deleting user', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
