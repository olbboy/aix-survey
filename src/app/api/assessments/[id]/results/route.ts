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

    // Get itemScores from snapshot (already calculated when finalized)
    let itemScores = assessment.snapshot.itemScores as Record<string, number>;

    // Debug: Log itemScores to diagnose issues
    console.log('[Results API] Assessment ID:', params.id);
    console.log('[Results API] itemScores keys count:', Object.keys(itemScores || {}).length);
    console.log('[Results API] itemScores sample:', Object.entries(itemScores || {}).slice(0, 3));

    // Check if itemScores is empty or invalid - FALLBACK to responses
    if (!itemScores || Object.keys(itemScores).length === 0) {
      console.error('[Results API] WARNING: itemScores is empty! Snapshot may be corrupted.');
      console.error('[Results API] Attempting to rebuild from responses...');

      // Rebuild itemScores from responses as fallback
      itemScores = {};
      assessment.responses.forEach((response: any) => {
        if (
          response.itemId &&
          response.score !== null &&
          response.score !== undefined &&
          response.score > 0
        ) {
          itemScores[response.itemId] = response.score;
        }
      });

      console.log('[Results API] Rebuilt itemScores count:', Object.keys(itemScores).length);

      if (Object.keys(itemScores).length === 0) {
        console.error('[Results API] ERROR: No valid scores found in responses either!');
        return NextResponse.json(
          {
            error: 'No assessment data found',
            message: 'Vui lòng hoàn thành lại đánh giá. Dữ liệu snapshot có thể bị lỗi.'
          },
          { status: 400 }
        );
      }
    }

    // Prepare item data for gap analysis using snapshot scores
    const items = assessment.template.domains.flatMap((domain: any) =>
      domain.items
        .map((item: any) => {
          const score = itemScores[item.id];
          if (score === undefined || score === null) return null;

          return {
            itemCode: item.itemCode,
            itemId: item.id,
            itemName: item.itemName,
            score: score,
            domainCode: domain.code,
          };
        })
        .filter((item: any) => item !== null && item.score > 0)
    );

    // Calculate gaps and recommendations
    const gaps = calculateItemGaps(items);
    const strengths = getTopStrengths(items, 5);
    const weaknesses = getTopWeaknesses(items, 5);
    const recommendations = generateRecommendations(gaps);

    // Prepare domains with items for radar charts using snapshot scores
    // CRITICAL FIX: Only include items that have actual scores (no || 0 defaulting!)
    const domains = assessment.template.domains.map((domain: any) => ({
      code: domain.code,
      name: domain.name,
      items: domain.items
        .map((item: any) => {
          const score = itemScores[item.id];

          // Skip items without scores (don't default to 0!)
          if (score === undefined || score === null || score <= 0) {
            return null;
          }

          return {
            itemCode: item.itemCode,
            itemName: item.itemName,
            score: score,
          };
        })
        .filter((item: any) => item !== null), // Remove null items
    }));

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
      domains,
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
