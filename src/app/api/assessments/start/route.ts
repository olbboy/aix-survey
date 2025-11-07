/**
 * POST /api/assessments/start
 * Create new assessment (guest or logged-in)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session-helpers';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const startSchema = z.object({
  industry: z.string().optional(),
  size: z.string().optional(),
  region: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industry, size, region } = startSchema.parse(body);

    // Check if user is logged in
    const session = await getSession();
    const userId = session?.user?.id;

    // Get active template
    const template = await prisma.assessmentTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'No active template found' },
        { status: 404 }
      );
    }

    // Create assessment
    const sessionId = userId ? undefined : nanoid();
    const expiresAt = userId
      ? undefined
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const assessment = await prisma.assessment.create({
      data: {
        sessionId,
        userId,
        templateId: template.id,
        industry,
        size,
        region,
        status: 'IN_PROGRESS',
        expiresAt,
      },
    });

    // Set sessionId cookie for guests
    if (sessionId) {
      const response = NextResponse.json({
        assessmentId: assessment.id,
        sessionId,
        templateVersion: template.version,
      });

      response.cookies.set('assessment_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return response;
    }

    return NextResponse.json({
      assessmentId: assessment.id,
      templateVersion: template.version,
    });
  } catch (error) {
    console.error('Failed to start assessment:', error);
    return NextResponse.json(
      { error: 'Failed to start assessment' },
      { status: 500 }
    );
  }
}
