/**
 * POST /api/assessments/[id]/finalize
 * Complete assessment and create immutable snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session-helpers';
import { calculateAssessmentScore } from '@/lib/scoring/scoring-engine';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const sessionCookie = request.cookies.get('assessment_session')?.value;

    // Load assessment with all data needed for scoring
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: {
        template: {
          include: {
            domains: {
              include: {
                items: true,
              },
            },
          },
        },
        responses: true,
      },
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

    // Check if already finalized
    if (assessment.status === 'FINALIZED') {
      const existingSnapshot = await prisma.assessmentSnapshot.findUnique({
        where: { assessmentId: assessment.id },
      });

      return NextResponse.json({
        message: 'Assessment already finalized',
        snapshotId: existingSnapshot?.id,
      });
    }

    // DEBUG: Log assessment data
    console.log('[Finalize API] Assessment ID:', params.id);
    console.log('[Finalize API] Total responses in DB:', assessment.responses.length);
    console.log('[Finalize API] Sample responses:', assessment.responses.slice(0, 5).map((r: any) => ({
      itemId: r.itemId,
      score: r.score,
      scoreType: typeof r.score,
    })));

    // Prepare data for scoring
    const domainData = assessment.template.domains.map((domain: any) => {
      const items = domain.items
        .map((item: any) => {
          const response = assessment.responses.find((r: any) => r.itemId === item.id);

          // Only include items that have been scored (score must be 1-5, not null or 0)
          if (!response || response.score === null || response.score === undefined || response.score < 1) {
            return null;
          }

          return {
            itemCode: item.itemCode,
            itemId: item.id,
            score: response.score,
            weight: item.weight,
          };
        })
        .filter((item: any) => item !== null); // Filter out null items

      return {
        domainCode: domain.code,
        domainId: domain.id,
        domainName: domain.name,
        domainWeight: domain.weight,
        totalItems: domain.items.length,
        items,
      };
    });

    // DEBUG: Log domain data
    console.log('[Finalize API] Domain data:', domainData.map((d: any) => ({
      domain: d.domainCode,
      totalItems: d.totalItems,
      answeredItems: d.items.length,
    })));

    // Calculate scores using scoring engine
    const scores = calculateAssessmentScore(domainData);

    // DEBUG: Log calculated scores
    console.log('[Finalize API] Calculated scores:', {
      totalScore: scores.totalScore,
      completeness: scores.completeness,
      answeredItems: scores.answeredItems,
      totalItems: scores.totalItems,
    });

    // VALIDATION: Require at least 50% completion before finalizing
    const MINIMUM_COMPLETION_PERCENTAGE = 50;
    if (scores.completeness < MINIMUM_COMPLETION_PERCENTAGE) {
      console.error('[Finalize API] VALIDATION FAILED: Completeness below 50%', {
        completeness: scores.completeness,
        answeredItems: scores.answeredItems,
        totalItems: scores.totalItems,
        required: MINIMUM_COMPLETION_PERCENTAGE,
      });
      return NextResponse.json(
        {
          error: 'Assessment incomplete',
          message: `Cần trả lời ít nhất ${MINIMUM_COMPLETION_PERCENTAGE}% câu hỏi để hoàn thành đánh giá`,
          completeness: scores.completeness,
          answeredItems: scores.answeredItems,
          totalItems: scores.totalItems,
          required: MINIMUM_COMPLETION_PERCENTAGE,
          debug: {
            totalResponsesInDB: assessment.responses.length,
            validScores: assessment.responses.filter((r: any) => r.score >= 1 && r.score <= 5).length,
            nullScores: assessment.responses.filter((r: any) => r.score === null).length,
            zeroScores: assessment.responses.filter((r: any) => r.score === 0).length,
          },
        },
        { status: 400 }
      );
    }

    // VALIDATION: Ensure at least some items have valid scores
    if (scores.answeredItems === 0) {
      console.error('[Finalize API] VALIDATION FAILED: No answered items', {
        totalResponsesInDB: assessment.responses.length,
        validScores: assessment.responses.filter((r: any) => r.score >= 1 && r.score <= 5).length,
      });
      return NextResponse.json(
        {
          error: 'No responses found',
          message: 'Vui lòng trả lời ít nhất một câu hỏi trước khi hoàn thành đánh giá',
          completeness: 0,
          answeredItems: 0,
          totalItems: scores.totalItems,
          debug: {
            totalResponsesInDB: assessment.responses.length,
            sampleScores: assessment.responses.slice(0, 10).map((r: any) => r.score),
          },
        },
        { status: 400 }
      );
    }

    // Create item scores map (use itemId as key for proper lookup)
    // Only include items with actual scores (1-5, not null or 0)
    const itemScores: Record<string, number> = {};
    assessment.responses.forEach((response: any) => {
      if (
        response.itemId &&
        response.score !== null &&
        response.score !== undefined &&
        response.score >= 1
      ) {
        itemScores[response.itemId] = response.score;
      }
    });

    // Create domain scores map
    const domainScores: Record<string, number> = {};
    scores.domainScores.forEach((ds) => {
      domainScores[ds.domainCode] = ds.averageScore;
    });

    // Create snapshot data
    const snapshotData = {
      assessment: {
        id: assessment.id,
        industry: assessment.industry,
        size: assessment.size,
        region: assessment.region,
      },
      responses: assessment.responses.map((r: any) => ({
        itemId: r.itemId,
        score: r.score,
        currentState: r.currentState,
      })),
      calculatedAt: new Date().toISOString(),
    };

    // Generate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(snapshotData))
      .digest('hex');

    // Create snapshot
    const snapshot = await prisma.assessmentSnapshot.create({
      data: {
        assessmentId: assessment.id,
        itemScores,
        domainScores,
        totalScore: scores.totalScore,
        maturityLevel: scores.maturityLevel,
        templateVersion: assessment.template.version,
        numResponses: assessment.responses.length,
        completeness: scores.completeness,
        snapshotData,
        checksum,
      },
    });

    // Update assessment status
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
    });

    return NextResponse.json({
      snapshotId: snapshot.id,
      scores: {
        itemScores,
        domainScores,
        totalScore: scores.totalScore,
        maturityLevel: scores.maturityLevel,
        maturityLevelEn: scores.maturityLevelEn,
        completeness: scores.completeness,
      },
    });
  } catch (error) {
    console.error('Failed to finalize assessment:', error);
    return NextResponse.json(
      { error: 'Failed to finalize assessment' },
      { status: 500 }
    );
  }
}
