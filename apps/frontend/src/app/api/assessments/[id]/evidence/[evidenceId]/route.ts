/**
 * Evidence Detail API
 * DELETE /api/assessments/[id]/evidence/[evidenceId] - Delete evidence
 * GET /api/assessments/[id]/evidence/[evidenceId] - Get evidence details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '@/lib/storage/storage-service';

export const dynamic = 'force-dynamic';

/**
 * Get evidence details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; evidenceId: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId, evidenceId } = await context.params;

    // Find evidence
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        assessmentId,
      },
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
        storageKey: true,
        virusScanned: true,
        scanResult: true,
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error('Error getting evidence:', error);
    return NextResponse.json(
      {
        error: 'Failed to get evidence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete evidence
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; evidenceId: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId, evidenceId } = await context.params;

    // Find evidence
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        assessmentId,
      },
      select: {
        id: true,
        storageKey: true,
        assessment: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // Check assessment status (only allow deletion for DRAFT and IN_PROGRESS)
    if (!['DRAFT', 'IN_PROGRESS'].includes(evidence.assessment.status)) {
      return NextResponse.json(
        { error: 'Evidence can only be deleted from draft or in-progress assessments' },
        { status: 400 }
      );
    }

    // Delete from storage
    const storage = getStorage();
    try {
      await storage.deleteFile(evidence.storageKey);
    } catch (storageError) {
      console.error('Failed to delete from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.evidence.delete({
      where: { id: evidenceId },
    });

    return NextResponse.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete evidence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
