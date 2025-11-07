/**
 * Evidence List API
 * GET /api/assessments/[id]/evidence
 *
 * Returns all evidence files for an assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId } = await context.params;

    // Check if assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Get all evidence for this assessment
    const evidences = await prisma.evidence.findMany({
      where: { assessmentId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        itemCode: true,
        description: true,
        uploadedAt: true,
        uploadedBy: true,
        storageUrl: true,
        virusScanned: true,
        scanResult: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return NextResponse.json({
      assessmentId,
      count: evidences.length,
      evidences,
    });
  } catch (error) {
    console.error('Error listing evidence:', error);
    return NextResponse.json(
      {
        error: 'Failed to list evidence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
