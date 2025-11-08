/**
 * CSV Export Service
 * Generates assessment data in CSV format with multiple sheets
 */

export interface CSVExportData {
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

  // Item responses
  itemResponses: Array<{
    itemCode: string;
    itemName: string;
    domainCode: string;
    domainName: string;
    score: number;
    currentState: string;
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
 * Generate CSV export with multiple sheets
 * Returns a string containing all sheets separated by double line breaks
 */
export function generateAssessmentCSV(data: CSVExportData): string {
  const sheets: string[] = [];

  // Sheet 1: Overview
  sheets.push(generateOverviewSheet(data));

  // Sheet 2: Domain Scores
  sheets.push(generateDomainScoresSheet(data));

  // Sheet 3: Item Responses
  sheets.push(generateItemResponsesSheet(data));

  // Sheet 4: Gap Analysis
  sheets.push(generateGapAnalysisSheet(data));

  // Sheet 5: Recommendations
  sheets.push(generateRecommendationsSheet(data));

  // Join all sheets with separator
  return sheets.join('\n\n\n');
}

/**
 * Sheet 1: Overview
 */
function generateOverviewSheet(data: CSVExportData): string {
  const rows: string[][] = [];

  // Header
  rows.push(['=== OVERVIEW ===']);
  rows.push([]);

  // Assessment metadata
  rows.push(['Field', 'Value']);
  rows.push(['Assessment ID', data.assessmentId]);
  rows.push(['Organization Name', data.organizationName]);
  rows.push(['Industry', data.industry]);
  rows.push(['Company Size', data.companySize]);
  rows.push(['Region', data.region]);
  rows.push(['Completion Date', data.completedAt]);
  rows.push([]);

  // Scoring results
  rows.push(['Overall Score', data.totalScore.toFixed(2)]);
  rows.push(['Maturity Level', data.maturityLevel]);
  rows.push(['Completion Percentage', `${data.completeness}%`]);
  rows.push(['Total Domains', data.domainScores.length.toString()]);
  rows.push([
    'Total Items',
    data.domainScores.reduce((sum, d) => sum + d.totalItems, 0).toString(),
  ]);
  rows.push([
    'Completed Items',
    data.domainScores.reduce((sum, d) => sum + d.completedItems, 0).toString(),
  ]);

  return rowsToCSV(rows);
}

/**
 * Sheet 2: Domain Scores
 */
function generateDomainScoresSheet(data: CSVExportData): string {
  const rows: string[][] = [];

  // Header
  rows.push(['=== DOMAIN SCORES ===']);
  rows.push([]);

  // Column headers
  rows.push([
    'Domain Code',
    'Domain Name',
    'Score',
    'Completed Items',
    'Total Items',
    'Completion %',
  ]);

  // Data rows
  data.domainScores.forEach((domain) => {
    const completionPct = Math.round((domain.completedItems / domain.totalItems) * 100);

    rows.push([
      domain.domainCode,
      domain.domainName,
      domain.score.toFixed(2),
      domain.completedItems.toString(),
      domain.totalItems.toString(),
      `${completionPct}%`,
    ]);
  });

  return rowsToCSV(rows);
}

/**
 * Sheet 3: Item Responses
 */
function generateItemResponsesSheet(data: CSVExportData): string {
  const rows: string[][] = [];

  // Header
  rows.push(['=== ITEM RESPONSES ===']);
  rows.push([]);

  // Column headers
  rows.push([
    'Item Code',
    'Item Name',
    'Domain Code',
    'Domain Name',
    'Score',
    'Current State Description',
  ]);

  // Data rows
  data.itemResponses.forEach((item) => {
    rows.push([
      item.itemCode,
      item.itemName,
      item.domainCode,
      item.domainName,
      item.score.toString(),
      item.currentState || '(Not provided)',
    ]);
  });

  return rowsToCSV(rows);
}

/**
 * Sheet 4: Gap Analysis
 */
function generateGapAnalysisSheet(data: CSVExportData): string {
  const rows: string[][] = [];

  // Header
  rows.push(['=== GAP ANALYSIS ===']);
  rows.push([]);

  // Column headers
  rows.push([
    'Priority',
    'Item Code',
    'Item Name',
    'Current Score',
    'Target Score',
    'Gap',
    'Effort Required',
    'Expected Impact',
  ]);

  // Sort by priority (HIGH -> MEDIUM -> LOW) and gap size
  const sortedGaps = [...data.gaps].sort((a, b) => {
    const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.gap - a.gap;
  });

  // Data rows
  sortedGaps.forEach((gap) => {
    rows.push([
      gap.priority,
      gap.itemCode,
      gap.itemName,
      gap.currentScore.toFixed(1),
      gap.targetScore.toFixed(1),
      gap.gap.toFixed(1),
      gap.effort,
      gap.impact,
    ]);
  });

  return rowsToCSV(rows);
}

/**
 * Sheet 5: Recommendations
 */
function generateRecommendationsSheet(data: CSVExportData): string {
  const rows: string[][] = [];

  // Header
  rows.push(['=== STRATEGIC RECOMMENDATIONS ===']);
  rows.push([]);

  // Column headers
  rows.push(['#', 'Recommendation']);

  // Data rows
  data.recommendations.forEach((recommendation, index) => {
    rows.push([(index + 1).toString(), recommendation]);
  });

  return rowsToCSV(rows);
}

/**
 * Helper: Convert rows to CSV format
 * Handles proper escaping of quotes, commas, and newlines
 */
function rowsToCSV(rows: string[][]): string {
  return rows
    .map((row) => {
      return row
        .map((cell) => {
          // Convert to string
          const cellStr = String(cell);

          // Check if cell needs to be quoted
          const needsQuotes = cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n');

          if (needsQuotes) {
            // Escape quotes by doubling them
            const escaped = cellStr.replace(/"/g, '""');
            return `"${escaped}"`;
          }

          return cellStr;
        })
        .join(',');
    })
    .join('\n');
}

/**
 * Generate single-sheet simplified CSV
 * Useful for quick data analysis in Excel
 */
export function generateSimplifiedCSV(data: CSVExportData): string {
  const rows: string[][] = [];

  // Headers
  rows.push([
    'Item Code',
    'Item Name',
    'Domain',
    'Current Score',
    'Target Score',
    'Gap',
    'Priority',
    'Effort',
    'Impact',
    'Current State',
  ]);

  // Build a map of item responses for quick lookup
  const itemResponseMap = new Map<string, string>();
  data.itemResponses.forEach((item) => {
    itemResponseMap.set(item.itemCode, item.currentState);
  });

  // Data rows from gap analysis
  data.gaps.forEach((gap) => {
    rows.push([
      gap.itemCode,
      gap.itemName,
      gap.itemCode.split('.')[0], // Extract domain from code
      gap.currentScore.toFixed(1),
      gap.targetScore.toFixed(1),
      gap.gap.toFixed(1),
      gap.priority,
      gap.effort,
      gap.impact,
      itemResponseMap.get(gap.itemCode) || '',
    ]);
  });

  return rowsToCSV(rows);
}

/**
 * Add UTF-8 BOM for Excel compatibility
 * Excel requires BOM to properly recognize UTF-8 encoding
 */
export function addUTF8BOM(csvContent: string): string {
  return '\ufeff' + csvContent;
}
