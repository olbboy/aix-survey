/**
 * GET /api/assessments/[id]/results
 * Get calculated results with recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session-helpers';
import {
  calculateItemGaps,
  getTopStrengths,
  getTopWeaknesses,
  generateRecommendations,
} from '@/lib/scoring/gap-analysis';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const sessionCookie = request.cookies.get('assessment_session')?.value;

    // Load assessment with snapshot
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: {
        snapshot: true,
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

    // Check if finalized
    if (!assessment.snapshot) {
      return NextResponse.json(
        { error: 'Assessment not finalized yet' },
        { status: 400 }
      );
    }

    // Prepare item data for gap analysis
    const items = assessment.template.domains.flatMap((domain: any) =>
      domain.items.map((item: any) => {
        const response = assessment.responses.find((r: any) => r.itemId === item.id);
        return {
          itemCode: item.itemCode,
          itemId: item.id,
          itemName: item.itemName,
          score: response?.score || 0,
          domainCode: domain.code,
        };
      })
    ).filter((item: any) => item.score > 0);

    // Calculate gaps and recommendations
    const gaps = calculateItemGaps(items);
    const strengths = getTopStrengths(items, 5);
    const weaknesses = getTopWeaknesses(items, 5);
    const recommendations = generateRecommendations(gaps);

    // Return comprehensive results
    return NextResponse.json({
      assessment: {
        id: assessment.id,
        status: assessment.status,
        industry: assessment.industry,
        size: assessment.size,
        region: assessment.region,
        finalizedAt: assessment.finalizedAt,
      },
      snapshot: {
        id: assessment.snapshot.id,
        totalScore: assessment.snapshot.totalScore,
        maturityLevel: assessment.snapshot.maturityLevel,
        completeness: assessment.snapshot.completeness,
        domainScores: assessment.snapshot.domainScores,
        itemScores: assessment.snapshot.itemScores,
        createdAt: assessment.snapshot.createdAt,
      },
      analysis: {
        strengths: strengths.map((s) => ({
          itemCode: s.itemCode,
          itemName: s.itemName,
          score: s.score,
        })),
        weaknesses: weaknesses.map((w) => ({
          itemCode: w.itemCode,
          itemName: w.itemName,
          score: w.score,
        })),
        gaps: gaps.slice(0, 10).map((g) => ({
          itemCode: g.itemCode,
          itemName: g.itemName,
          currentScore: g.currentScore,
          targetScore: g.targetScore,
          gap: g.gap,
          priority: g.priority,
          effort: g.effort,
          impact: g.impact,
        })),
        recommendations,
      },
    });
  } catch (error) {
    console.error('Failed to get results:', error);
    return NextResponse.json(
      { error: 'Failed to get results' },
      { status: 500 }
    );
  }
}
