/**
 * Gap Analysis and Roadmap Generation
 */

import { DomainScore, ItemScore } from './scoring-engine';

export interface GapItem {
  itemCode: string;
  itemId: string;
  itemName: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DomainGap {
  domainCode: string;
  domainName: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  items: GapItem[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  quarter: string; // Q1-2025, Q2-2025, etc.
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  domainCode: string;
  relatedItemCodes: string[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

/**
 * Calculate gap for each domain
 * Default target is next maturity level (current + 1)
 */
export function calculateDomainGaps(
  domainScores: DomainScore[],
  targetScores?: Record<string, number>
): DomainGap[] {
  return domainScores.map((domain) => {
    // Default target: next whole number (e.g., 2.5 → 3.0, 3.2 → 4.0)
    const defaultTarget = Math.min(Math.ceil(domain.averageScore), 5);
    const target = targetScores?.[domain.domainCode] || defaultTarget;
    const gap = Math.round((target - domain.averageScore) * 100) / 100;

    return {
      domainCode: domain.domainCode,
      domainName: domain.domainName,
      currentScore: domain.averageScore,
      targetScore: target,
      gap,
      items: [], // Will be populated by calculateItemGaps
    };
  });
}

/**
 * Calculate gap for each item and prioritize
 */
export function calculateItemGaps(
  items: Array<{
    itemCode: string;
    itemId: string;
    itemName: string;
    score: number;
    domainCode: string;
  }>,
  targetScores?: Record<string, number>
): GapItem[] {
  return items
    .map((item) => {
      // Default target: next whole number
      const defaultTarget = Math.min(Math.ceil(item.score), 5);
      const target = targetScores?.[item.itemCode] || defaultTarget;
      const gap = target - item.score;

      // Prioritize based on current score (lower = higher priority)
      let priority: 'HIGH' | 'MEDIUM' | 'LOW';
      if (item.score <= 2) {
        priority = 'HIGH';
      } else if (item.score <= 3) {
        priority = 'MEDIUM';
      } else {
        priority = 'LOW';
      }

      // Effort estimation (simplified - can be enhanced with ML)
      let effort: 'HIGH' | 'MEDIUM' | 'LOW';
      if (gap >= 2) {
        effort = 'HIGH';
      } else if (gap >= 1) {
        effort = 'MEDIUM';
      } else {
        effort = 'LOW';
      }

      // Impact estimation (higher gap = higher impact)
      let impact: 'HIGH' | 'MEDIUM' | 'LOW';
      if (gap >= 2) {
        impact = 'HIGH';
      } else if (gap >= 1) {
        impact = 'MEDIUM';
      } else {
        impact = 'LOW';
      }

      return {
        itemCode: item.itemCode,
        itemId: item.itemId,
        itemName: item.itemName,
        currentScore: item.score,
        targetScore: target,
        gap,
        priority,
        effort,
        impact,
      };
    })
    .filter((item) => item.gap > 0) // Only items with gap
    .sort((a, b) => {
      // Sort by priority (HIGH > MEDIUM > LOW), then by gap (descending)
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.gap - a.gap;
    });
}

/**
 * Generate roadmap based on gap analysis
 * Groups items into quarters based on priority and effort
 */
export function generateRoadmap(
  gapItems: GapItem[],
  startYear: number = new Date().getFullYear(),
  startQuarter: number = Math.ceil((new Date().getMonth() + 1) / 3)
): RoadmapItem[] {
  const roadmap: RoadmapItem[] = [];
  let currentYear = startYear;
  let currentQuarter = startQuarter;

  // ICE Score calculation (Impact, Confidence, Ease)
  const calculateICE = (item: GapItem): number => {
    const impactScore = item.impact === 'HIGH' ? 10 : item.impact === 'MEDIUM' ? 5 : 3;
    const confidenceScore = 8; // Assume 80% confidence
    const easeScore = item.effort === 'LOW' ? 10 : item.effort === 'MEDIUM' ? 5 : 3;
    return (impactScore + confidenceScore + easeScore) / 3;
  };

  // Sort by ICE score
  const sortedItems = [...gapItems].sort((a, b) => calculateICE(b) - calculateICE(a));

  // Group items into quarters (max 5 items per quarter)
  const ITEMS_PER_QUARTER = 5;
  for (let i = 0; i < sortedItems.length; i += ITEMS_PER_QUARTER) {
    const quarterItems = sortedItems.slice(i, i + ITEMS_PER_QUARTER);
    const quarter = `Q${currentQuarter}-${currentYear}`;

    quarterItems.forEach((item) => {
      roadmap.push({
        id: `roadmap-${item.itemCode}-${quarter}`,
        title: `Nâng cấp: ${item.itemName}`,
        description: `Nâng điểm từ ${item.currentScore} lên ${item.targetScore} (gap: ${item.gap})`,
        quarter,
        priority: item.priority,
        effort: item.effort,
        impact: item.impact,
        domainCode: item.itemCode.split('.')[0], // Extract domain from itemCode
        relatedItemCodes: [item.itemCode],
        status: 'NOT_STARTED',
      });
    });

    // Move to next quarter
    currentQuarter++;
    if (currentQuarter > 4) {
      currentQuarter = 1;
      currentYear++;
    }
  }

  return roadmap;
}

/**
 * Get top strengths (highest scoring items)
 */
export function getTopStrengths(
  items: Array<{ itemCode: string; itemName: string; score: number }>,
  limit: number = 5
): Array<{ itemCode: string; itemName: string; score: number }> {
  return [...items]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get top weaknesses (lowest scoring items)
 */
export function getTopWeaknesses(
  items: Array<{ itemCode: string; itemName: string; score: number }>,
  limit: number = 5
): Array<{ itemCode: string; itemName: string; score: number }> {
  return [...items]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

/**
 * Generate actionable recommendations based on gaps
 */
export function generateRecommendations(gapItems: GapItem[]): string[] {
  const recommendations: string[] = [];

  // High priority items
  const highPriority = gapItems.filter((item) => item.priority === 'HIGH');
  if (highPriority.length > 0) {
    recommendations.push(
      `🔴 Ưu tiên cao: Tập trung vào ${highPriority.length} hạng mục có điểm thấp (≤2): ${highPriority
        .slice(0, 3)
        .map((item) => item.itemCode)
        .join(', ')}...`
    );
  }

  // Quick wins (high impact, low effort)
  const quickWins = gapItems.filter(
    (item) => item.impact === 'HIGH' && item.effort === 'LOW'
  );
  if (quickWins.length > 0) {
    recommendations.push(
      `⚡ Quick wins: ${quickWins.length} hạng mục có tác động lớn và dễ thực hiện: ${quickWins
        .map((item) => item.itemCode)
        .join(', ')}`
    );
  }

  // Long-term investments (high impact, high effort)
  const longTerm = gapItems.filter(
    (item) => item.impact === 'HIGH' && item.effort === 'HIGH'
  );
  if (longTerm.length > 0) {
    recommendations.push(
      `📈 Đầu tư dài hạn: ${longTerm.length} hạng mục yêu cầu đầu tư lớn nhưng tác động cao: ${longTerm
        .slice(0, 3)
        .map((item) => item.itemCode)
        .join(', ')}...`
    );
  }

  return recommendations;
}
