/**
 * Evidence Upload URL API
 * POST /api/assessments/[id]/evidence/upload-url
 *
 * Generates a presigned URL for client-side file upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage, validateFile } from '@/lib/storage/storage-service';

export const dynamic = 'force-dynamic';

interface UploadUrlRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  itemCode?: string;
  description?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId } = await context.params;
    const body: UploadUrlRequest = await request.json();

    // Validate request body
    if (!body.fileName || !body.fileType || !body.fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(body.fileName, body.fileType, body.fileSize);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        status: true,
        sessionId: true,
        userId: true,
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Check assessment status (allow DRAFT and IN_PROGRESS)
    if (!['DRAFT', 'IN_PROGRESS'].includes(assessment.status)) {
      return NextResponse.json(
        { error: 'Evidence can only be uploaded for draft or in-progress assessments' },
        { status: 400 }
      );
    }

    // Get storage provider
    const storage = getStorage();

    // Generate presigned URL
    const presignedData = await storage.getPresignedUploadUrl({
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
      assessmentId,
      itemCode: body.itemCode,
    });

    // Return presigned URL and metadata
    return NextResponse.json({
      uploadUrl: presignedData.uploadUrl,
      fileKey: presignedData.fileKey,
      expiresIn: presignedData.expiresIn,
      assessmentId,
      itemCode: body.itemCode,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate upload URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
