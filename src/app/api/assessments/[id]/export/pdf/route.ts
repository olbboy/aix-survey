/**
 * PDF Export API Endpoint
 * GET /api/assessments/[id]/export/pdf
 *
 * Generates and returns a PDF report for the specified assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateAssessmentPDF, type PDFExportData } from '@/lib/export/pdf-service';
import {
  calculateAssessmentScore,
  calculateDomainScore,
} from '@/lib/scoring/scoring-engine';
import {
  calculateItemGaps,
  getTopStrengths,
  getTopWeaknesses,
  generateRecommendations,
} from '@/lib/scoring/gap-analysis';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;

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

    // Build response map for calculations
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

    // Prepare domain scores for PDF
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

    // Flatten all items for gap analysis
    const allItems = domainData.flatMap((domain: any) => domain.items);

    // Calculate gaps and get top strengths/weaknesses
    const gaps = calculateItemGaps(allItems);
    const topStrengths = getTopStrengths(allItems, 5) as Array<{
      itemCode: string;
      itemName: string;
      score: number;
      domainCode: string;
    }>;
    const topWeaknesses = getTopWeaknesses(allItems, 5) as Array<{
      itemCode: string;
      itemName: string;
      score: number;
      domainCode: string;
    }>;
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

    // Prepare PDF data
    const pdfData: PDFExportData = {
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
      topStrengths,
      topWeaknesses,
      gaps,
      recommendations,
    };

    // Generate PDF
    const pdfStream = await generateAssessmentPDF(pdfData);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Create sanitized filename
    const sanitizedOrgName = assessment.organizationName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    const filename = `AI_Maturity_Assessment_${sanitizedOrgName}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Return PDF with proper headers
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Expires': '0',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
