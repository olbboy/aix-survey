/**
 * Smoke Tests for Assessment Flow
 * Quick validation of critical functionality
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateAssessmentScore,
  calculateDomainScore,
  getMaturityLevel,
} from '@/lib/scoring/scoring-engine';
import {
  calculateItemGaps,
  getTopStrengths,
  getTopWeaknesses,
  generateRecommendations,
  calculateICEScore,
} from '@/lib/scoring/gap-analysis';

describe('Scoring Engine - Smoke Tests', () => {
  it('should calculate domain score correctly', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', score: 3, weight: 1.0 },
      { itemCode: '1.2', itemId: '2', score: 4, weight: 1.0 },
      { itemCode: '1.3', itemId: '3', score: 5, weight: 1.0 },
    ];

    const score = calculateDomainScore(items);

    expect(score).toBe(4.0); // (3 + 4 + 5) / 3 = 4
  });

  it('should handle empty items array', () => {
    const score = calculateDomainScore([]);
    expect(score).toBe(0);
  });

  it('should calculate weighted average when weights differ', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', score: 2, weight: 1.0 },
      { itemCode: '1.2', itemId: '2', score: 4, weight: 2.0 },
    ];

    const score = calculateDomainScore(items);
    const expected = (2 * 1.0 + 4 * 2.0) / (1.0 + 2.0);

    expect(score).toBeCloseTo(expected, 2);
  });

  it('should assign correct maturity level', () => {
    expect(getMaturityLevel(4.8)).toBe('Tối ưu');
    expect(getMaturityLevel(4.0)).toBe('Trưởng thành');
    expect(getMaturityLevel(3.0)).toBe('Phát triển');
    expect(getMaturityLevel(2.0)).toBe('Khởi đầu');
    expect(getMaturityLevel(1.0)).toBe('Sơ khai');
  });

  it('should handle boundary scores correctly', () => {
    expect(getMaturityLevel(4.6)).toBe('Tối ưu');
    expect(getMaturityLevel(4.59)).toBe('Trưởng thành');
    expect(getMaturityLevel(3.6)).toBe('Trưởng thành');
    expect(getMaturityLevel(3.59)).toBe('Phát triển');
  });

  it('should calculate full assessment score', () => {
    const domainData = [
      {
        domainCode: 'data',
        domainId: '1',
        domainName: 'Dữ liệu',
        domainWeight: 1.0,
        totalItems: 3,
        items: [
          { itemCode: '1.1', itemId: '1', score: 3, weight: 1.0 },
          { itemCode: '1.2', itemId: '2', score: 4, weight: 1.0 },
          { itemCode: '1.3', itemId: '3', score: 5, weight: 1.0 },
        ],
      },
      {
        domainCode: 'infra',
        domainId: '2',
        domainName: 'Hạ tầng',
        domainWeight: 1.0,
        totalItems: 2,
        items: [
          { itemCode: '2.1', itemId: '4', score: 4, weight: 1.0 },
          { itemCode: '2.2', itemId: '5', score: 4, weight: 1.0 },
        ],
      },
    ];

    const result = calculateAssessmentScore(domainData);

    expect(result).toHaveProperty('domainScores');
    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('maturityLevel');
    expect(result).toHaveProperty('completeness');

    expect(result.domainScores).toHaveLength(2);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.totalScore).toBeLessThanOrEqual(5);
    expect(result.completeness).toBe(100);
  });
});

describe('Gap Analysis - Smoke Tests', () => {
  it('should identify items with gaps', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 2, domainCode: 'data' },
      { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 4, domainCode: 'data' },
      { itemCode: '1.3', itemId: '3', itemName: 'Item 3', score: 5, domainCode: 'data' },
    ];

    const gaps = calculateItemGaps(items);

    expect(Array.isArray(gaps)).toBe(true);
    // Item with score 2 should have a gap
    const lowScoreGap = gaps.find(g => g.itemCode === '1.1');
    expect(lowScoreGap).toBeDefined();
    expect(lowScoreGap!.gap).toBeGreaterThan(0);
  });

  it('should assign HIGH priority to low scores', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', itemName: 'Low score item', score: 1, domainCode: 'data' },
    ];

    const gaps = calculateItemGaps(items);

    expect(gaps[0].priority).toBe('HIGH');
  });

  it('should calculate ICE score correctly', () => {
    const score = calculateICEScore(0.8, 0.7, 0.9);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeCloseTo(0.8 * 0.7 * 0.9, 2);
  });

  it('should identify top strengths', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 5, domainCode: 'data' },
      { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 4, domainCode: 'data' },
      { itemCode: '1.3', itemId: '3', itemName: 'Item 3', score: 3, domainCode: 'data' },
      { itemCode: '1.4', itemId: '4', itemName: 'Item 4', score: 5, domainCode: 'infra' },
    ];

    const strengths = getTopStrengths(items, 2);

    expect(strengths).toHaveLength(2);
    expect(strengths[0].score).toBe(5);
    expect(strengths[1].score).toBe(5);
  });

  it('should identify top weaknesses', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 1, domainCode: 'data' },
      { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 2, domainCode: 'data' },
      { itemCode: '1.3', itemId: '3', itemName: 'Item 3', score: 4, domainCode: 'data' },
    ];

    const weaknesses = getTopWeaknesses(items, 2);

    expect(weaknesses).toHaveLength(2);
    expect(weaknesses[0].score).toBe(1);
    expect(weaknesses[1].score).toBe(2);
  });

  it('should generate actionable recommendations', () => {
    const gaps = [
      {
        itemCode: '1.1',
        itemId: '1',
        itemName: 'Data Quality',
        currentScore: 2,
        targetScore: 4,
        gap: 2,
        priority: 'HIGH',
        effort: 'MEDIUM',
        impact: 'HIGH',
        iceScore: 0.8,
        domainCode: 'data',
      },
    ];

    const recommendations = generateRecommendations(gaps);

    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(typeof recommendations[0]).toBe('string');
    expect(recommendations[0].length).toBeGreaterThan(0);
  });
});

describe('Data Validation - Smoke Tests', () => {
  it('should validate score range', () => {
    const validScores = [1, 2, 3, 4, 5];
    const invalidScores = [0, 6, -1, 10];

    validScores.forEach(score => {
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(5);
    });

    invalidScores.forEach(score => {
      expect(
        score < 1 || score > 5
      ).toBe(true);
    });
  });

  it('should validate maturity levels', () => {
    const validLevels = ['Sơ khai', 'Khởi đầu', 'Phát triển', 'Trưởng thành', 'Tối ưu'];

    validLevels.forEach(level => {
      const score = level === 'Sơ khai' ? 1.5 :
                    level === 'Khởi đầu' ? 2.5 :
                    level === 'Phát triển' ? 3.5 :
                    level === 'Trưởng thành' ? 4.5 : 5.0;

      expect(getMaturityLevel(score)).toBe(level);
    });
  });

  it('should validate priority values', () => {
    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];

    const items = [
      { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 1, domainCode: 'data' },
      { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 3, domainCode: 'data' },
      { itemCode: '1.3', itemId: '3', itemName: 'Item 3', score: 4, domainCode: 'data' },
    ];

    const gaps = calculateItemGaps(items);

    gaps.forEach(gap => {
      expect(validPriorities).toContain(gap.priority);
    });
  });

  it('should handle completeness calculation', () => {
    const domainData = [
      {
        domainCode: 'data',
        domainId: '1',
        domainName: 'Dữ liệu',
        domainWeight: 1.0,
        totalItems: 10,
        items: [
          { itemCode: '1.1', itemId: '1', score: 3, weight: 1.0 },
          { itemCode: '1.2', itemId: '2', score: 4, weight: 1.0 },
        ], // 2 out of 10
      },
    ];

    const result = calculateAssessmentScore(domainData);

    expect(result.completeness).toBe(20); // 2/10 = 20%
  });
});

describe('Edge Cases - Smoke Tests', () => {
  it('should handle single item assessment', () => {
    const domainData = [
      {
        domainCode: 'data',
        domainId: '1',
        domainName: 'Dữ liệu',
        domainWeight: 1.0,
        totalItems: 1,
        items: [
          { itemCode: '1.1', itemId: '1', score: 3, weight: 1.0 },
        ],
      },
    ];

    const result = calculateAssessmentScore(domainData);

    expect(result.totalScore).toBe(3);
    expect(result.maturityLevel).toBe('Phát triển');
    expect(result.completeness).toBe(100);
  });

  it('should handle all maximum scores', () => {
    const items = Array.from({ length: 37 }, (_, i) => ({
      itemCode: `${i + 1}`,
      itemId: `${i + 1}`,
      score: 5,
      weight: 1.0,
    }));

    const domainData = [
      {
        domainCode: 'all',
        domainId: '1',
        domainName: 'All',
        domainWeight: 1.0,
        totalItems: 37,
        items,
      },
    ];

    const result = calculateAssessmentScore(domainData);

    expect(result.totalScore).toBe(5);
    expect(result.maturityLevel).toBe('Tối ưu');
  });

  it('should handle all minimum scores', () => {
    const items = Array.from({ length: 37 }, (_, i) => ({
      itemCode: `${i + 1}`,
      itemId: `${i + 1}`,
      score: 1,
      weight: 1.0,
    }));

    const domainData = [
      {
        domainCode: 'all',
        domainId: '1',
        domainName: 'All',
        domainWeight: 1.0,
        totalItems: 37,
        items,
      },
    ];

    const result = calculateAssessmentScore(domainData);

    expect(result.totalScore).toBe(1);
    expect(result.maturityLevel).toBe('Sơ khai');
  });

  it('should handle mixed domain weights', () => {
    const domainData = [
      {
        domainCode: 'data',
        domainId: '1',
        domainName: 'Dữ liệu',
        domainWeight: 2.0, // Higher weight
        totalItems: 1,
        items: [{ itemCode: '1.1', itemId: '1', score: 5, weight: 1.0 }],
      },
      {
        domainCode: 'infra',
        domainId: '2',
        domainName: 'Hạ tầng',
        domainWeight: 1.0,
        totalItems: 1,
        items: [{ itemCode: '2.1', itemId: '2', score: 3, weight: 1.0 }],
      },
    ];

    const result = calculateAssessmentScore(domainData);

    // (5 * 2.0 + 3 * 1.0) / (2.0 + 1.0) = 13 / 3 = 4.33
    expect(result.totalScore).toBeCloseTo(4.33, 1);
  });

  it('should handle items with no gaps', () => {
    const items = [
      { itemCode: '1.1', itemId: '1', itemName: 'Perfect item', score: 5, domainCode: 'data' },
    ];

    const gaps = calculateItemGaps(items);

    expect(gaps).toHaveLength(0); // No gaps for perfect score
  });

  it('should handle large number of gaps', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      itemCode: `${i + 1}`,
      itemId: `${i + 1}`,
      itemName: `Item ${i + 1}`,
      score: 1,
      domainCode: 'data',
    }));

    const gaps = calculateItemGaps(items);

    expect(gaps.length).toBe(100);
    gaps.forEach(gap => {
      expect(gap.gap).toBeGreaterThan(0);
      expect(gap.priority).toBe('HIGH');
    });
  });
});

describe('Performance - Smoke Tests', () => {
  it('should calculate scores quickly for typical assessment', () => {
    const startTime = Date.now();

    const domainData = Array.from({ length: 5 }, (_, d) => ({
      domainCode: `domain-${d}`,
      domainId: `${d}`,
      domainName: `Domain ${d}`,
      domainWeight: 1.0,
      totalItems: 7,
      items: Array.from({ length: 7 }, (_, i) => ({
        itemCode: `${d}.${i}`,
        itemId: `${d}-${i}`,
        score: Math.floor(Math.random() * 5) + 1,
        weight: 1.0,
      })),
    }));

    calculateAssessmentScore(domainData);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(100); // Should complete in < 100ms
  });

  it('should handle gap analysis efficiently', () => {
    const startTime = Date.now();

    const items = Array.from({ length: 37 }, (_, i) => ({
      itemCode: `${i + 1}`,
      itemId: `${i + 1}`,
      itemName: `Item ${i + 1}`,
      score: Math.floor(Math.random() * 3) + 1,
      domainCode: 'data',
    }));

    calculateItemGaps(items);
    getTopStrengths(items, 5);
    getTopWeaknesses(items, 5);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(50); // Should complete in < 50ms
  });
});
