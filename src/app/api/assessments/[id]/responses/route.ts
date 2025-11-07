/**
 * PATCH /api/assessments/[id]/responses
 * Autosave responses (debounced from client)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session-helpers';
import { saveAssessmentDraft, saveProgress } from '@/lib/redis/redis-client';
import { z } from 'zod';

const responsesSchema = z.record(
  z.object({
    score: z.number().int().min(1).max(5).nullable(),
    currentState: z.string().max(5000).optional(),
  })
);

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
    const responses = responsesSchema.parse(body.responses);

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
        (r) => r.score !== null
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
            score: response.score || 0,
            currentState: response.currentState,
          },
          create: {
            assessmentId: assessment.id,
            itemId,
            score: response.score || 0,
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
    const totalItems = await prisma.item.count({
      where: {
        domain: {
          templateId: assessment.templateId,
        },
      },
    });

    const totalResponses = await prisma.response.count({
      where: { assessmentId: assessment.id },
    });

    const progress = Math.round((totalResponses / totalItems) * 100);

    return NextResponse.json({
      success: true,
      savedAt: new Date().toISOString(),
      progress,
    });
  } catch (error) {
    console.error('Failed to save responses:', error);
    return NextResponse.json(
      { error: 'Failed to save responses' },
      { status: 500 }
    );
  }
}
