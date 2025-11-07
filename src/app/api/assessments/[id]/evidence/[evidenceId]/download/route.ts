/**
 * Evidence Download API
 * GET /api/assessments/[id]/evidence/[evidenceId]/download
 *
 * Generates a presigned download URL or streams the file
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getStorage } from '@/lib/storage/storage-service';

export const dynamic = 'force-dynamic';

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
        storageKey: true,
        storageUrl: true,
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    // Get storage provider
    const storage = getStorage();

    // Check storage type
    const storageType = process.env.STORAGE_TYPE || 'local';

    if (storageType === 's3') {
      // For S3: Generate presigned download URL and redirect
      const downloadUrl = await storage.getPresignedDownloadUrl(
        evidence.storageKey,
        evidence.fileName
      );

      return NextResponse.json({
        downloadUrl,
        fileName: evidence.fileName,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        expiresIn: 3600, // 1 hour
      });
    } else {
      // For local storage: Stream file directly
      const { LocalStorageProvider } = require('@/lib/storage/local-storage');
      const localStorage = storage as InstanceType<typeof LocalStorageProvider>;

      try {
        const fileBuffer = await localStorage.readFile(evidence.storageKey);

        return new Response(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': evidence.fileType,
            'Content-Disposition': `attachment; filename="${evidence.fileName}"`,
            'Content-Length': evidence.fileSize.toString(),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        });
      } catch (error) {
        console.error('Failed to read file:', error);
        return NextResponse.json(
          { error: 'File not found in storage' },
          { status: 404 }
        );
      }
    }
  } catch (error) {
    console.error('Error downloading evidence:', error);
    return NextResponse.json(
      {
        error: 'Failed to download evidence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
