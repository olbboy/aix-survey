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

    // Prepare data for scoring
    const domainData = assessment.template.domains.map((domain: any) => {
      const items = domain.items.map((item: any) => {
        const response = assessment.responses.find((r: any) => r.itemId === item.id);
        return {
          itemCode: item.itemCode,
          itemId: item.id,
          score: response?.score || 0,
          weight: item.weight,
        };
      }).filter((item: any) => item.score > 0); // Only scored items

      return {
        domainCode: domain.code,
        domainId: domain.id,
        domainName: domain.name,
        domainWeight: domain.weight,
        totalItems: domain.items.length,
        items,
      };
    });

    // Calculate scores using scoring engine
    const scores = calculateAssessmentScore(domainData);

    // Create item scores map
    const itemScores: Record<string, number> = {};
    assessment.responses.forEach((response: any) => {
      const item = assessment.template.domains
        .flatMap((d: any) => d.items)
        .find((i: any) => i.id === response.itemId);
      if (item) {
        itemScores[item.itemCode] = response.score;
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
