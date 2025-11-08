/**
 * Send Assessment Results Email API
 * POST /api/assessments/[id]/send-results
 *
 * Sends assessment results via email with PDF attachment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendAssessmentResultsEmail } from '@/lib/email/email-service';
import { generateAssessmentPDF } from '@/lib/export/pdf-service';
import type { PDFExportData } from '@/lib/export/pdf-service';
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

interface SendResultsRequest {
  recipientEmail: string;
  recipientName?: string;
  includePDF?: boolean;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: assessmentId } = await context.params;
    const body: SendResultsRequest = await request.json();

    // Validate request body
    if (!body.recipientEmail) {
      return NextResponse.json(
        { error: 'recipientEmail is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Fetch assessment with all related data
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
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

    // Check if assessment is completed
    if (assessment.status !== 'FINALIZED') {
      return NextResponse.json(
        { error: 'Assessment must be finalized before sending results' },
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

    // Prepare domain scores
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
    const completedDate = assessment.finalizedAt
      ? new Date(assessment.finalizedAt).toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    // Generate PDF if requested
    let pdfAttachment: { filename: string; content: Buffer } | undefined;

    if (body.includePDF !== false) {
      // Default to true
      const pdfData: PDFExportData = {
        assessmentId: assessment.id,
        organizationName: assessment.organizationName || 'Organization',
        industry: assessment.industry || 'N/A',
        companySize: assessment.size || 'N/A',
        region: assessment.region || 'N/A',
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
      const sanitizedOrgName = (assessment.organizationName || 'Organization')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50);
      const filename = `AI_Maturity_Assessment_${sanitizedOrgName}_${new Date().toISOString().split('T')[0]}.pdf`;

      pdfAttachment = {
        filename,
        content: pdfBuffer,
      };
    }

    // Generate results URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resultsUrl = `${baseUrl}/assessment/results/${assessmentId}`;

    // Send email
    const emailResult = await sendAssessmentResultsEmail(
      body.recipientEmail,
      body.recipientName || 'User',
      {
        organizationName: assessment.organizationName || 'Organization',
        totalScore: scoringResult.totalScore,
        maturityLevel: scoringResult.maturityLevel,
        completedAt: completedDate,
        resultsUrl,
      },
      pdfAttachment
    );

    if (!emailResult.success) {
      // Save failed notification to database
      await prisma.emailNotification.create({
        data: {
          assessmentId,
          recipientEmail: body.recipientEmail,
          recipientName: body.recipientName,
          subject: `AI Maturity Assessment Results - ${assessment.organizationName}`,
          templateName: 'assessment-results',
          status: 'FAILED',
          attempts: 1,
          lastError: emailResult.error,
          attachments: pdfAttachment ? [{ filename: pdfAttachment.filename }] : null,
          templateData: {
            organizationName: assessment.organizationName,
            totalScore: scoringResult.totalScore,
            maturityLevel: scoringResult.maturityLevel,
            completedAt: completedDate,
            resultsUrl,
          },
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: emailResult.error,
        },
        { status: 500 }
      );
    }

    // Save successful notification to database
    await prisma.emailNotification.create({
      data: {
        assessmentId,
        recipientEmail: body.recipientEmail,
        recipientName: body.recipientName,
        subject: `AI Maturity Assessment Results - ${assessment.organizationName}`,
        templateName: 'assessment-results',
        status: 'SENT',
        sentAt: new Date(),
        attempts: 1,
        attachments: pdfAttachment ? [{ filename: pdfAttachment.filename }] : null,
        templateData: {
          organizationName: assessment.organizationName,
          totalScore: scoringResult.totalScore,
          maturityLevel: scoringResult.maturityLevel,
          completedAt: completedDate,
          resultsUrl,
        },
      },
    });

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      recipientEmail: body.recipientEmail,
      includedPDF: body.includePDF !== false,
    });
  } catch (error) {
    console.error('Error sending assessment results:', error);
    return NextResponse.json(
      {
        error: 'Failed to send assessment results',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
