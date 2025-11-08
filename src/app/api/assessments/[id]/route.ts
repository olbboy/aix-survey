/**
 * GET /api/assessments/[id]
 * Get assessment with template, items, and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session-helpers';
import { log } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const sessionCookie = request.cookies.get('assessment_session')?.value;

    // Load assessment with template, domains, items
    const assessment = await prisma.assessment.findUnique({
      where: { id: params.id },
      include: {
        template: {
          include: {
            domains: {
              include: {
                items: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        responses: {
          include: {
            evidences: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Authorization check
    const isOwner =
      assessment.userId === session?.user?.id ||
      assessment.sessionId === sessionCookie;

    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Transform responses to map
    const responsesMap = assessment.responses.reduce((acc: any, response: any) => {
      acc[response.itemId] = {
        score: response.score,
        currentState: response.currentState || '',
        evidences: response.evidences.map((e: any) => ({
          id: e.id,
          fileName: e.fileName,
          fileSize: e.fileSize,
          storageUrl: e.storageUrl,
        })),
      };
      return acc;
    }, {} as Record<string, any>);

    log.info('Assessment fetched', {
      assessmentId: params.id,
      userId: session?.user?.id || 'guest',
      responseCount: Object.keys(responsesMap).length,
      status: assessment.status,
    });

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        status: assessment.status,
        industry: assessment.industry,
        size: assessment.size,
        region: assessment.region,
        templateVersion: assessment.template.version,
        createdAt: assessment.createdAt,
        updatedAt: assessment.updatedAt,
      },
      template: {
        version: assessment.template.version,
        domains: assessment.template.domains.map((domain: any) => ({
          id: domain.id,
          code: domain.code,
          name: domain.name,
          items: domain.items.map((item: any) => ({
            id: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            level1: item.level1,
            level2: item.level2,
            level3: item.level3,
            level4: item.level4,
            level5: item.level5,
            weight: item.weight,
            evidenceRequired: item.evidenceRequired,
            evidenceRequiredIfLe: item.evidenceRequiredIfLe,
            allowedFileTypes: item.allowedFileTypes,
          })),
        })),
      },
      responses: responsesMap,
    });
  } catch (error) {
    log.error('Failed to get assessment', {
      assessmentId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to get assessment' },
      { status: 500 }
    );
  }
}
