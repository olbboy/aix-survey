/**
 * CSV Export API Endpoint
 * GET /api/assessments/[id]/export/csv?format=full|simple
 *
 * Generates and returns CSV data for the specified assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import {
  generateAssessmentCSV,
  generateSimplifiedCSV,
  addUTF8BOM,
  type CSVExportData,
} from '@/lib/export/csv-service';
import {
  calculateAssessmentScore,
  calculateDomainScore,
} from '@/lib/scoring/scoring-engine';
import {
  calculateItemGaps,
  generateRecommendations,
} from '@/lib/scoring/gap-analysis';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'full'; // 'full' or 'simple'

    // Fetch assessment with all related data
    const assessment = await prisma.assessment.findUnique({
      where: { id },
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
        results: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Check if assessment is finalized
    if (assessment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Assessment must be finalized before exporting' },
        { status: 400 }
      );
    }

    // Get the latest result
    const result = assessment.results[0];
    if (!result) {
      return NextResponse.json(
        { error: 'Assessment results not found' },
        { status: 404 }
      );
    }

    // Build response map
    const responsesMap: Record<string, { score: number; currentState: string }> = {};
    assessment.responses.forEach((response: any) => {
      responsesMap[response.itemId] = {
        score: response.score,
        currentState: response.currentState || '',
      };
    });

    // Calculate domain scores and prepare data
    const domainData = assessment.template.domains.map((domain: any) => {
      const domainItems = domain.items.map((item: any) => {
        const response = responsesMap[item.id];
        return {
          itemCode: item.itemCode,
          itemId: item.id,
          itemName: item.itemName,
          score: response?.score || 0,
          weight: item.weight,
          domainCode: domain.domainCode,
        };
      });

      return {
        domainCode: domain.domainCode,
        domainId: domain.id,
        domainName: domain.domainName,
        domainWeight: domain.domainWeight,
        totalItems: domain.items.length,
        items: domainItems,
      };
    });

    // Calculate scoring data
    const scoringResult = calculateAssessmentScore(domainData);

    // Prepare domain scores for CSV
    const domainScores = domainData.map((domain: any) => {
      const completedItems = domain.items.filter((item: any) => item.score > 0).length;
      const score = calculateDomainScore(domain.items);

      return {
        domainCode: domain.domainCode,
        domainName: domain.domainName,
        score,
        totalItems: domain.totalItems,
        completedItems,
      };
    });

    // Prepare item responses for CSV
    const itemResponses = domainData.flatMap((domain: any) =>
      domain.items.map((item: any) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        domainCode: domain.domainCode,
        domainName: domain.domainName,
        score: item.score,
        currentState: responsesMap[item.itemId]?.currentState || '',
      }))
    );

    // Flatten all items for gap analysis
    const allItems = domainData.flatMap((domain: any) => domain.items);

    // Calculate gaps and recommendations
    const gaps = calculateItemGaps(allItems);
    const recommendations = generateRecommendations(gaps);

    // Format date
    const completedDate = assessment.completedAt
      ? new Date(assessment.completedAt).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    // Prepare CSV data
    const csvData: CSVExportData = {
      assessmentId: assessment.id,
      organizationName: assessment.organizationName,
      industry: assessment.industry,
      companySize: assessment.companySize,
      region: assessment.region,
      completedAt: completedDate,
      totalScore: scoringResult.totalScore,
      maturityLevel: scoringResult.maturityLevel,
      completeness: scoringResult.completeness,
      domainScores,
      itemResponses,
      gaps,
      recommendations,
    };

    // Generate CSV based on format
    let csvContent: string;
    if (format === 'simple') {
      csvContent = generateSimplifiedCSV(csvData);
    } else {
      csvContent = generateAssessmentCSV(csvData);
    }

    // Add UTF-8 BOM for Excel compatibility
    const csvWithBOM = addUTF8BOM(csvContent);

    // Create sanitized filename
    const sanitizedOrgName = assessment.organizationName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    const formatSuffix = format === 'simple' ? '_Simple' : '_Full';
    const filename = `AI_Maturity_Assessment_${sanitizedOrgName}${formatSuffix}_${new Date().toISOString().split('T')[0]}.csv`;

    // Return CSV with proper headers
    return new Response(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(csvWithBOM).toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Expires': '0',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate CSV',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
