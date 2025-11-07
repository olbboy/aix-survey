/**
 * Scoring Engine
 * Calculates item scores, domain scores, total score and maturity level
 */

import { MATURITY_LEVELS } from '../utils/constants';

// Types
export interface ItemScore {
  itemCode: string;
  itemId: string;
  score: number;
  weight: number;
}

export interface DomainScore {
  domainCode: string;
  domainId: string;
  domainName: string;
  itemScores: ItemScore[];
  averageScore: number;
  weightedScore: number;
  weight: number;
  completeness: number; // Percentage of items answered
}

export interface AssessmentScore {
  domainScores: DomainScore[];
  totalScore: number;
  weightedTotalScore: number;
  maturityLevel: string;
  maturityLevelEn: string;
  completeness: number;
  totalItems: number;
  answeredItems: number;
}

/**
 * Calculate domain score (average of item scores)
 * Supports both weighted and unweighted calculation
 */
export function calculateDomainScore(
  items: Array<{ score: number; weight?: number }>
): number {
  if (items.length === 0) return 0;

  const hasWeights = items.some((item) => item.weight && item.weight !== 1);

  if (hasWeights) {
    // Weighted average
    const weightedSum = items.reduce(
      (sum, item) => sum + item.score * (item.weight || 1),
      0
    );
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    return weightedSum / totalWeight;
  } else {
    // Simple average
    const sum = items.reduce((sum, item) => sum + item.score, 0);
    return sum / items.length;
  }
}

/**
 * Calculate total score (average of domain scores)
 */
export function calculateTotalScore(
  domains: Array<{ score: number; weight?: number }>
): number {
  if (domains.length === 0) return 0;

  const hasWeights = domains.some((domain) => domain.weight && domain.weight !== 1);

  if (hasWeights) {
    // Weighted average
    const weightedSum = domains.reduce(
      (sum, domain) => sum + domain.score * (domain.weight || 1),
      0
    );
    const totalWeight = domains.reduce((sum, domain) => sum + (domain.weight || 1), 0);
    return weightedSum / totalWeight;
  } else {
    // Simple average
    const sum = domains.reduce((sum, domain) => sum + domain.score, 0);
    return sum / domains.length;
  }
}

/**
 * Determine maturity level based on score
 */
export function getMaturityLevel(
  score: number
): { label: string; labelEn: string; color: string } {
  if (score >= MATURITY_LEVELS.OPTIMIZED.min) {
    return {
      label: MATURITY_LEVELS.OPTIMIZED.label,
      labelEn: MATURITY_LEVELS.OPTIMIZED.labelEn,
      color: MATURITY_LEVELS.OPTIMIZED.color,
    };
  } else if (score >= MATURITY_LEVELS.MATURE.min) {
    return {
      label: MATURITY_LEVELS.MATURE.label,
      labelEn: MATURITY_LEVELS.MATURE.labelEn,
      color: MATURITY_LEVELS.MATURE.color,
    };
  } else if (score >= MATURITY_LEVELS.DEVELOPING.min) {
    return {
      label: MATURITY_LEVELS.DEVELOPING.label,
      labelEn: MATURITY_LEVELS.DEVELOPING.labelEn,
      color: MATURITY_LEVELS.DEVELOPING.color,
    };
  } else if (score >= MATURITY_LEVELS.BEGINNING.min) {
    return {
      label: MATURITY_LEVELS.BEGINNING.label,
      labelEn: MATURITY_LEVELS.BEGINNING.labelEn,
      color: MATURITY_LEVELS.BEGINNING.color,
    };
  } else {
    return {
      label: MATURITY_LEVELS.INITIAL.label,
      labelEn: MATURITY_LEVELS.INITIAL.labelEn,
      color: MATURITY_LEVELS.INITIAL.color,
    };
  }
}

/**
 * Calculate completeness percentage
 */
export function calculateCompleteness(
  answeredItems: number,
  totalItems: number
): number {
  if (totalItems === 0) return 0;
  return Math.round((answeredItems / totalItems) * 100);
}

/**
 * Calculate full assessment score
 */
export function calculateAssessmentScore(
  domainData: Array<{
    domainCode: string;
    domainId: string;
    domainName: string;
    domainWeight: number;
    totalItems: number;
    items: Array<{
      itemCode: string;
      itemId: string;
      score: number;
      weight: number;
    }>;
  }>
): AssessmentScore {
  // Calculate domain scores
  const domainScores: DomainScore[] = domainData.map((domain) => {
    const averageScore = calculateDomainScore(domain.items);
    const completeness = calculateCompleteness(
      domain.items.length,
      domain.totalItems
    );

    return {
      domainCode: domain.domainCode,
      domainId: domain.domainId,
      domainName: domain.domainName,
      itemScores: domain.items,
      averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimals
      weightedScore: Math.round(averageScore * 100) / 100,
      weight: domain.domainWeight,
      completeness,
    };
  });

  // Calculate total score
  const totalScore = calculateTotalScore(
    domainScores.map((d) => ({ score: d.averageScore, weight: d.weight }))
  );
  const roundedTotalScore = Math.round(totalScore * 100) / 100;

  // Determine maturity level
  const maturityLevel = getMaturityLevel(roundedTotalScore);

  // Calculate overall completeness
  const totalItems = domainData.reduce((sum, d) => sum + d.totalItems, 0);
  const answeredItems = domainData.reduce((sum, d) => sum + d.items.length, 0);
  const completeness = calculateCompleteness(answeredItems, totalItems);

  return {
    domainScores,
    totalScore: roundedTotalScore,
    weightedTotalScore: roundedTotalScore,
    maturityLevel: maturityLevel.label,
    maturityLevelEn: maturityLevel.labelEn,
    completeness,
    totalItems,
    answeredItems,
  };
}

/**
 * Validate assessment completeness
 * Returns warnings if data is incomplete
 */
export function validateAssessmentCompleteness(
  score: AssessmentScore
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check overall completeness
  if (score.completeness < 100) {
    warnings.push(
      `Chỉ hoàn thành ${score.completeness}% câu hỏi (${score.answeredItems}/${score.totalItems}). Kết quả có thể không chính xác.`
    );
  }

  // Check domain completeness
  score.domainScores.forEach((domain) => {
    if (domain.completeness < 100) {
      warnings.push(
        `Miền "${domain.domainName}": Chỉ hoàn thành ${domain.completeness}%. Điểm miền có thể không chính xác.`
      );
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
