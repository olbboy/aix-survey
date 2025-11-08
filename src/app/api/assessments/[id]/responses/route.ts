/**
 * PATCH /api/assessments/[id]/responses
 * Autosave responses (debounced from client)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session-helpers';
import { saveAssessmentDraft, saveProgress } from '@/lib/redis/redis-client';
import { log } from '@/lib/utils/logger';
import { SaveResponsesBodySchema, safeValidate } from '@/lib/validation/schemas';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const sessionCookie = request.cookies.get('assessment_session')?.value;

    // Load assessment to verify ownership
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Authorization
    const isOwner =
      assessment.userId === session?.user?.id ||
      assessment.sessionId === sessionCookie;

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    // ENHANCED: Use centralized validation schema
    const validation = safeValidate(SaveResponsesBodySchema, body);
    if (!validation.success) {
      log.warn('Invalid response data', {
        assessmentId: params.id,
        userId: session?.user?.id,
        error: validation.error,
      });
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { responses } = validation.data;

    // For guests: save to Redis + DB
    // For logged-in: save to DB only
    if (assessment.sessionId && !assessment.userId) {
      // Guest: save to Redis
      const draft = {
        assessmentId: assessment.id,
        templateVersion: assessment.template?.version || '',
        industry: assessment.industry,
        size: assessment.size,
        region: assessment.region,
        responses: responses as any,
        updatedAt: new Date().toISOString(),
      };

      await saveAssessmentDraft(assessment.sessionId, draft);

      // Calculate progress
      const totalItems = await prisma.item.count({
        where: {
          domain: {
            templateId: assessment.templateId,
          },
        },
      });

      const answeredCount = Object.values(responses).filter(
        (r) => r.score !== null && r.score >= 1
      ).length;
      const progress = Math.round((answeredCount / totalItems) * 100);

      await saveProgress(assessment.sessionId, progress);
    }

    // Save to DB (upsert multiple responses)
    await prisma.$transaction(
      Object.entries(responses).map(([itemId, response]) =>
        prisma.response.upsert({
          where: {
            assessmentId_itemId: {
              assessmentId: assessment.id,
              itemId,
            },
          },
          update: {
            score: response.score, // Keep null if not scored, don't default to 0
            currentState: response.currentState,
          },
          create: {
            assessmentId: assessment.id,
            itemId,
            score: response.score, // Keep null if not scored, don't default to 0
            currentState: response.currentState,
          },
        })
      )
    );

    // Update assessment timestamp
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { updatedAt: new Date() },
    });

    // Calculate progress for response
    // IMPORTANT: Only count responses with valid scores (1-5), not null or 0
    const totalItems = await prisma.item.count({
      where: {
        domain: {
          templateId: assessment.templateId,
        },
      },
    });

    const answeredResponses = await prisma.response.count({
      where: {
        assessmentId: assessment.id,
        score: {
          not: null,
          gte: 1,
        },
      },
    });

    const progress = Math.round((answeredResponses / totalItems) * 100);

    log.info('Assessment responses saved', {
      assessmentId: params.id,
      userId: session?.user?.id || 'guest',
      sessionId: assessment.sessionId,
      responseCount: Object.keys(responses).length,
      progress,
    });

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
      progress,
    });
  } catch (error) {
    log.error('Failed to save responses', {
      assessmentId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to save responses' },
      { status: 500 }
    );
  }
}
