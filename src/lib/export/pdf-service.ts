/**
 * PDF Export Service
 * Generates professional assessment reports in PDF format
 */

import PDFDocument from 'pdfkit';
import type { Readable } from 'stream';

export interface PDFExportData {
  // Assessment metadata
  assessmentId: string;
  organizationName: string;
  industry: string;
  companySize: string;
  region: string;
  completedAt: string;

  // Scoring results
  totalScore: number;
  maturityLevel: string;
  completeness: number;

  // Domain scores
  domainScores: Array<{
    domainCode: string;
    domainName: string;
    score: number;
    totalItems: number;
    completedItems: number;
  }>;

  // Strengths and weaknesses
  topStrengths: Array<{
    itemCode: string;
    itemName: string;
    score: number;
    domainCode: string;
  }>;

  topWeaknesses: Array<{
    itemCode: string;
    itemName: string;
    score: number;
    domainCode: string;
  }>;

  // Gap analysis
  gaps: Array<{
    itemCode: string;
    itemName: string;
    currentScore: number;
    targetScore: number;
    gap: number;
    priority: string;
    effort: string;
    impact: string;
  }>;

  // Recommendations
  recommendations: string[];
}

/**
 * Generate PDF assessment report
 */
export async function generateAssessmentPDF(data: PDFExportData): Promise<Readable> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `AI Maturity Assessment Report - ${data.organizationName}`,
          Author: 'AI Maturity Assessment Platform',
          Subject: 'AI Maturity Assessment Results',
          Creator: 'AIX Survey Platform',
          CreationDate: new Date(),
        },
      });

      // Set up font (using built-in Helvetica for Vietnamese support)
      doc.font('Helvetica');

      // Generate content sections
      generateCoverPage(doc, data);
      generateExecutiveSummary(doc, data);
      generateDomainScores(doc, data);
      generateStrengthsWeaknesses(doc, data);
      generateGapAnalysis(doc, data);
      generateRecommendations(doc, data);
      generateFooter(doc, data);

      // Finalize PDF
      doc.end();

      // Return stream
      resolve(doc as unknown as Readable);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate cover page
 */
function generateCoverPage(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  // Title
  doc
    .fontSize(28)
    .fillColor('#1e40af')
    .text('AI MATURITY ASSESSMENT', { align: 'center' });

  doc.moveDown(0.5);

  doc
    .fontSize(24)
    .fillColor('#3b82f6')
    .text('Comprehensive Report', { align: 'center' });

  doc.moveDown(3);

  // Organization info box
  const boxY = doc.y;
  doc
    .rect(75, boxY, doc.page.width - 150, 180)
    .fillAndStroke('#f0f9ff', '#3b82f6');

  doc.fillColor('#000000');
  doc.fontSize(16).text('Organization Information', 100, boxY + 20);
  doc.moveDown(1);

  doc.fontSize(12);
  doc.text(`Organization: ${data.organizationName}`, 100, doc.y);
  doc.moveDown(0.5);
  doc.text(`Industry: ${data.industry}`, 100, doc.y);
  doc.moveDown(0.5);
  doc.text(`Company Size: ${data.companySize}`, 100, doc.y);
  doc.moveDown(0.5);
  doc.text(`Region: ${data.region}`, 100, doc.y);
  doc.moveDown(0.5);
  doc.text(`Assessment Date: ${data.completedAt}`, 100, doc.y);

  doc.moveDown(4);

  // Maturity level badge
  const maturityColors: Record<string, string> = {
    'Sơ khai': '#ef4444',
    'Khởi đầu': '#f97316',
    'Phát triển': '#eab308',
    'Trưởng thành': '#3b82f6',
    'Tối ưu': '#22c55e',
  };

  const maturityColor = maturityColors[data.maturityLevel] || '#6b7280';

  doc
    .fontSize(18)
    .fillColor('#374151')
    .text('Maturity Level Achieved:', { align: 'center' });

  doc.moveDown(0.5);

  doc
    .fontSize(32)
    .fillColor(maturityColor)
    .text(data.maturityLevel.toUpperCase(), { align: 'center' });

  doc.moveDown(0.5);

  doc
    .fontSize(20)
    .fillColor('#1f2937')
    .text(`${data.totalScore.toFixed(2)}/5.0`, { align: 'center' });

  // Add new page
  doc.addPage();
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  addSectionHeader(doc, 'Executive Summary');

  doc.fontSize(12).fillColor('#374151');

  doc.text(
    `This report presents the results of the AI Maturity Assessment conducted for ${data.organizationName}. ` +
      `The assessment evaluates the organization's readiness and capability to adopt, implement, and scale ` +
      `Artificial Intelligence initiatives across five key domains.`,
    { align: 'justify' }
  );

  doc.moveDown(1);

  // Key metrics
  doc.fontSize(14).fillColor('#1f2937').text('Key Metrics:');
  doc.moveDown(0.5);

  doc.fontSize(12).fillColor('#374151');
  doc.list([
    `Overall Maturity Score: ${data.totalScore.toFixed(2)}/5.0`,
    `Maturity Level: ${data.maturityLevel}`,
    `Assessment Completion: ${data.completeness}%`,
    `Number of Domains Assessed: ${data.domainScores.length}`,
    `Total Items Evaluated: ${data.domainScores.reduce((sum, d) => sum + d.totalItems, 0)}`,
  ]);

  doc.moveDown(1);

  // Score interpretation
  doc.fontSize(14).fillColor('#1f2937').text('Score Interpretation:');
  doc.moveDown(0.5);

  const interpretation = getScoreInterpretation(data.totalScore);
  doc.fontSize(12).fillColor('#374151').text(interpretation, { align: 'justify' });

  doc.moveDown(1);

  // Chart placeholder (will be implemented with canvas in production)
  doc
    .fontSize(10)
    .fillColor('#6b7280')
    .text('[Radar Chart Visualization - Requires canvas setup in production]', { align: 'center' });

  doc.moveDown(2);
}

/**
 * Generate domain scores section
 */
function generateDomainScores(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  addSectionHeader(doc, 'Domain Scores Breakdown');

  doc.fontSize(12).fillColor('#374151');
  doc.text(
    'The following table shows your organization\'s performance across the five AI maturity domains:',
    { align: 'justify' }
  );

  doc.moveDown(1);

  // Table header
  const tableTop = doc.y;
  const colWidths = {
    domain: 200,
    score: 80,
    items: 80,
    completion: 100,
  };

  doc.fontSize(11).fillColor('#ffffff');

  // Header background
  doc.rect(50, tableTop, doc.page.width - 100, 25).fill('#1e40af');

  // Header text
  doc.text('Domain', 55, tableTop + 7, { width: colWidths.domain });
  doc.text('Score', 255, tableTop + 7, { width: colWidths.score });
  doc.text('Items', 335, tableTop + 7, { width: colWidths.items });
  doc.text('Completion', 415, tableTop + 7, { width: colWidths.completion });

  // Table rows
  let currentY = tableTop + 25;

  data.domainScores.forEach((domain, index) => {
    const rowColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';

    doc.rect(50, currentY, doc.page.width - 100, 30).fill(rowColor);

    doc.fontSize(10).fillColor('#1f2937');
    doc.text(domain.domainName, 55, currentY + 10, { width: colWidths.domain });
    doc.text(domain.score.toFixed(2), 255, currentY + 10, { width: colWidths.score });
    doc.text(`${domain.completedItems}/${domain.totalItems}`, 335, currentY + 10, { width: colWidths.items });

    const completion = Math.round((domain.completedItems / domain.totalItems) * 100);
    doc.text(`${completion}%`, 415, currentY + 10, { width: colWidths.completion });

    currentY += 30;
  });

  // Add border
  doc.rect(50, tableTop, doc.page.width - 100, currentY - tableTop).stroke('#d1d5db');

  doc.moveDown(3);
}

/**
 * Generate strengths and weaknesses
 */
function generateStrengthsWeaknesses(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  // Check if we need a new page
  if (doc.y > 600) {
    doc.addPage();
  }

  addSectionHeader(doc, 'Top 5 Strengths');

  doc.fontSize(12).fillColor('#374151');
  doc.text('Areas where your organization demonstrates high maturity:', { align: 'justify' });

  doc.moveDown(1);

  data.topStrengths.slice(0, 5).forEach((strength, index) => {
    doc
      .fontSize(11)
      .fillColor('#059669')
      .text(`${index + 1}. ${strength.itemName}`, { continued: true })
      .fillColor('#6b7280')
      .text(` (Score: ${strength.score}/5)`, { continued: false });

    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  addSectionHeader(doc, 'Top 5 Priority Areas');

  doc.fontSize(12).fillColor('#374151');
  doc.text('Areas requiring immediate attention and improvement:', { align: 'justify' });

  doc.moveDown(1);

  data.topWeaknesses.slice(0, 5).forEach((weakness, index) => {
    doc
      .fontSize(11)
      .fillColor('#dc2626')
      .text(`${index + 1}. ${weakness.itemName}`, { continued: true })
      .fillColor('#6b7280')
      .text(` (Score: ${weakness.score}/5)`, { continued: false });

    doc.moveDown(0.5);
  });

  doc.moveDown(2);
}

/**
 * Generate gap analysis
 */
function generateGapAnalysis(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  doc.addPage();

  addSectionHeader(doc, 'Gap Analysis');

  doc.fontSize(12).fillColor('#374151');
  doc.text(
    'The following table identifies gaps between your current state and target maturity levels, ' +
      'along with priority recommendations:',
    { align: 'justify' }
  );

  doc.moveDown(1);

  // Show top 10 gaps only
  const topGaps = data.gaps
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.gap - a.gap;
    })
    .slice(0, 10);

  topGaps.forEach((gap, index) => {
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
    }

    const priorityColors: Record<string, string> = {
      HIGH: '#dc2626',
      MEDIUM: '#f97316',
      LOW: '#3b82f6',
    };

    doc
      .fontSize(11)
      .fillColor('#1f2937')
      .text(`${index + 1}. ${gap.itemName}`);

    doc.moveDown(0.3);

    doc.fontSize(10).fillColor('#374151');
    doc.text(`   Current Score: ${gap.currentScore}/5 → Target Score: ${gap.targetScore}/5 (Gap: ${gap.gap})`);

    doc
      .fillColor(priorityColors[gap.priority])
      .text(`   Priority: ${gap.priority}`, { continued: true })
      .fillColor('#374151')
      .text(` | Effort: ${gap.effort} | Impact: ${gap.impact}`, { continued: false });

    doc.moveDown(1);
  });

  doc.moveDown(1);
}

/**
 * Generate recommendations
 */
function generateRecommendations(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  if (doc.y > 600) {
    doc.addPage();
  }

  addSectionHeader(doc, 'Strategic Recommendations');

  doc.fontSize(12).fillColor('#374151');
  doc.text(
    'Based on the gap analysis, we recommend the following strategic initiatives to improve ' +
      'your AI maturity:',
    { align: 'justify' }
  );

  doc.moveDown(1);

  data.recommendations.slice(0, 10).forEach((recommendation, index) => {
    // Check if we need a new page
    if (doc.y > 700) {
      doc.addPage();
    }

    doc
      .fontSize(11)
      .fillColor('#1f2937')
      .text(`${index + 1}. ${recommendation}`, { align: 'justify' });

    doc.moveDown(0.8);
  });

  doc.moveDown(2);

  // Next steps
  addSectionHeader(doc, 'Next Steps');

  doc.fontSize(12).fillColor('#374151');
  doc.list([
    'Review this report with key stakeholders and leadership team',
    'Prioritize improvement areas based on business objectives and resource availability',
    'Develop a detailed roadmap with timelines and success metrics',
    'Allocate resources and assign ownership for each initiative',
    'Monitor progress and conduct follow-up assessments quarterly',
  ]);

  doc.moveDown(2);
}

/**
 * Generate footer
 */
function generateFooter(doc: PDFKit.PDFDocument, data: PDFExportData): void {
  const pageCount = doc.bufferedPageRange().count;

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    // Add footer line
    doc
      .moveTo(50, doc.page.height - 30)
      .lineTo(doc.page.width - 50, doc.page.height - 30)
      .stroke('#d1d5db');

    // Add footer text
    doc
      .fontSize(9)
      .fillColor('#6b7280')
      .text(
        `AI Maturity Assessment Report | Generated: ${new Date().toLocaleDateString('vi-VN')} | Page ${i + 1} of ${pageCount}`,
        50,
        doc.page.height - 20,
        { align: 'center', width: doc.page.width - 100 }
      );
  }
}

/**
 * Helper: Add section header
 */
function addSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .fontSize(18)
    .fillColor('#1e40af')
    .text(title);

  doc.moveDown(1);

  // Add underline
  doc
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke('#3b82f6');

  doc.moveDown(1);
}

/**
 * Helper: Get score interpretation
 */
function getScoreInterpretation(score: number): string {
  if (score >= 4.6) {
    return (
      'Your organization demonstrates optimal AI maturity with systematic processes, ' +
      'continuous improvement, and industry-leading practices. Focus on maintaining excellence ' +
      'and exploring cutting-edge AI innovations.'
    );
  } else if (score >= 3.6) {
    return (
      'Your organization shows mature AI capabilities with well-defined processes and ' +
      'established governance. Continue optimizing existing systems and exploring advanced ' +
      'AI applications to reach optimal maturity.'
    );
  } else if (score >= 2.6) {
    return (
      'Your organization is in a development phase with growing AI capabilities. Focus on ' +
      'standardizing processes, improving data quality, and building organizational readiness ' +
      'for scaled AI adoption.'
    );
  } else if (score >= 1.6) {
    return (
      'Your organization is in the early stages of AI adoption. Prioritize building foundational ' +
      'capabilities including data infrastructure, basic analytics, and organizational awareness ' +
      'of AI potential.'
    );
  } else {
    return (
      'Your organization is beginning its AI journey. Focus on establishing basic data collection, ' +
      'building leadership awareness, and creating a roadmap for AI adoption aligned with ' +
      'business objectives.'
    );
  }
}
