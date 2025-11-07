/**
 * Evidence Upload Confirmation API
 * POST /api/assessments/[id]/evidence/confirm
 *
 * Confirms file upload and saves evidence metadata to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '@/lib/storage/storage-service';
import * as crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface ConfirmUploadRequest {
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  itemCode?: string;
  description?: string;
  responseId?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId } = await context.params;
    const body: ConfirmUploadRequest = await request.json();

    // Validate request body
    if (!body.fileKey || !body.fileName || !body.fileType || !body.fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileKey, fileName, fileType, fileSize' },
        { status: 400 }
      );
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

    // Get storage provider and verify file exists
    const storage = getStorage();
    const fileExists = await storage.fileExists(body.fileKey);

    if (!fileExists) {
      return NextResponse.json(
        { error: 'File not found in storage. Please upload the file first.' },
        { status: 404 }
      );
    }

    // Get file metadata from storage
    const metadata = await storage.getFileMetadata(body.fileKey);

    // Generate storage URL
    const storageUrl =
      process.env.STORAGE_TYPE === 's3'
        ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${body.fileKey}`
        : `${process.env.LOCAL_STORAGE_URL || 'http://localhost:3000/api/storage'}/file/${body.fileKey}`;

    // Determine who uploaded
    const uploadedBy = assessment.userId
      ? assessment.userId
      : assessment.sessionId
      ? `guest-${assessment.sessionId}`
      : 'unknown';

    // Create evidence record in database
    const evidence = await prisma.evidence.create({
      data: {
        assessmentId,
        responseId: body.responseId || null,
        fileName: body.fileName,
        fileType: body.fileType,
        fileSize: body.fileSize,
        storageUrl,
        storageKey: body.fileKey,
        checksum: metadata?.checksum || crypto.randomBytes(16).toString('hex'),
        description: body.description || null,
        uploadedBy,
        itemCode: body.itemCode || null,
        virusScanned: false, // Will be scanned asynchronously
        scanResult: null,
      },
    });

    // Return success with evidence metadata
    return NextResponse.json({
      success: true,
      evidence: {
        id: evidence.id,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        itemCode: evidence.itemCode,
        description: evidence.description,
        uploadedAt: evidence.uploadedAt,
        storageUrl: evidence.storageUrl,
      },
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return NextResponse.json(
      {
        error: 'Failed to confirm upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
