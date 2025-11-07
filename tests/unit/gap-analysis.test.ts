/**
 * Unit Tests for Gap Analysis
 */

import {
  calculateDomainGaps,
  calculateItemGaps,
  generateRoadmap,
  getTopStrengths,
  getTopWeaknesses,
  generateRecommendations,
} from '@/lib/scoring/gap-analysis';
import { DomainScore } from '@/lib/scoring/scoring-engine';

describe('Gap Analysis', () => {
  describe('calculateDomainGaps', () => {
    it('should calculate gaps with default targets', () => {
      const domainScores: DomainScore[] = [
        {
          domainCode: 'data',
          domainId: '1',
          domainName: 'Dữ liệu',
          itemScores: [],
          averageScore: 2.5,
          weightedScore: 2.5,
          weight: 1,
          completeness: 100,
        },
        {
          domainCode: 'infra',
          domainId: '2',
          domainName: 'Hạ tầng',
          itemScores: [],
          averageScore: 3.2,
          weightedScore: 3.2,
          weight: 1,
          completeness: 100,
        },
      ];

      const gaps = calculateDomainGaps(domainScores);

      // 2.5 → 3.0 (gap = 0.5)
      expect(gaps[0].currentScore).toBe(2.5);
      expect(gaps[0].targetScore).toBe(3);
      expect(gaps[0].gap).toBe(0.5);

      // 3.2 → 4.0 (gap = 0.8)
      expect(gaps[1].currentScore).toBe(3.2);
      expect(gaps[1].targetScore).toBe(4);
      expect(gaps[1].gap).toBe(0.8);
    });

    it('should use custom target scores', () => {
      const domainScores: DomainScore[] = [
        {
          domainCode: 'data',
          domainId: '1',
          domainName: 'Dữ liệu',
          itemScores: [],
          averageScore: 2.5,
          weightedScore: 2.5,
          weight: 1,
          completeness: 100,
        },
      ];

      const targetScores = { data: 4.0 };
      const gaps = calculateDomainGaps(domainScores, targetScores);

      expect(gaps[0].targetScore).toBe(4.0);
      expect(gaps[0].gap).toBe(1.5);
    });
  });

  describe('calculateItemGaps', () => {
    it('should calculate item gaps and prioritize', () => {
      const items = [
        { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 1, domainCode: 'data' },
        { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 3, domainCode: 'data' },
        { itemCode: '1.3', itemId: '3', itemName: 'Item 3', score: 4, domainCode: 'data' },
      ];

      const gaps = calculateItemGaps(items);

      // Should prioritize low scores first
      expect(gaps[0].itemCode).toBe('1.1'); // Score 1 → HIGH priority
      expect(gaps[0].priority).toBe('HIGH');
      expect(gaps[0].gap).toBe(1); // Target 2

      expect(gaps[1].itemCode).toBe('1.2'); // Score 3 → MEDIUM priority
      expect(gaps[1].priority).toBe('MEDIUM');
    });

    it('should filter out items with no gap', () => {
      const items = [
        { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 5, domainCode: 'data' },
        { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 2, domainCode: 'data' },
      ];

      const gaps = calculateItemGaps(items);

      // Item 1 (score 5) has no gap, should be filtered out
      expect(gaps).toHaveLength(1);
      expect(gaps[0].itemCode).toBe('1.2');
    });

    it('should estimate effort based on gap size', () => {
      const items = [
        { itemCode: '1.1', itemId: '1', itemName: 'Item 1', score: 1, domainCode: 'data' },
        { itemCode: '1.2', itemId: '2', itemName: 'Item 2', score: 3, domainCode: 'data' },
      ];

      const gaps = calculateItemGaps(items, { '1.1': 4 }); // Gap of 3

      expect(gaps[0].effort).toBe('HIGH'); // Gap >= 2
    });
  });

  describe('generateRoadmap', () => {
    it('should distribute items across quarters', () => {
      const gapItems = Array.from({ length: 12 }, (_, i) => ({
        itemCode: `1.${i + 1}`,
        itemId: `${i + 1}`,
        itemName: `Item ${i + 1}`,
        currentScore: 2,
        targetScore: 3,
        gap: 1,
        priority: 'HIGH' as const,
        effort: 'MEDIUM' as const,
        impact: 'HIGH' as const,
      }));

      const roadmap = generateRoadmap(gapItems, 2025, 1);

      // 12 items should be distributed across 3 quarters (5 items per quarter)
      expect(roadmap.length).toBe(12);

      // Check quarter distribution
      const q1Items = roadmap.filter((item) => item.quarter === 'Q1-2025');
      const q2Items = roadmap.filter((item) => item.quarter === 'Q2-2025');
      const q3Items = roadmap.filter((item) => item.quarter === 'Q3-2025');

      expect(q1Items.length).toBe(5);
      expect(q2Items.length).toBe(5);
      expect(q3Items.length).toBe(2);
    });

    it('should handle year rollover', () => {
      const gapItems = Array.from({ length: 20 }, (_, i) => ({
        itemCode: `1.${i + 1}`,
        itemId: `${i + 1}`,
        itemName: `Item ${i + 1}`,
        currentScore: 2,
        targetScore: 3,
        gap: 1,
        priority: 'MEDIUM' as const,
        effort: 'MEDIUM' as const,
        impact: 'MEDIUM' as const,
      }));

      const roadmap = generateRoadmap(gapItems, 2025, 4); // Start Q4-2025

      // Should roll over to 2026
      const q4_2025 = roadmap.filter((item) => item.quarter === 'Q4-2025');
      const q1_2026 = roadmap.filter((item) => item.quarter === 'Q1-2026');

      expect(q4_2025.length).toBe(5);
      expect(q1_2026.length).toBe(5);
    });
  });

  describe('getTopStrengths', () => {
    it('should return top N highest scoring items', () => {
      const items = [
        { itemCode: '1.1', itemName: 'Item 1', score: 5 },
        { itemCode: '1.2', itemName: 'Item 2', score: 4 },
        { itemCode: '1.3', itemName: 'Item 3', score: 3 },
        { itemCode: '1.4', itemName: 'Item 4', score: 2 },
      ];

      const top2 = getTopStrengths(items, 2);

      expect(top2).toHaveLength(2);
      expect(top2[0].score).toBe(5);
      expect(top2[1].score).toBe(4);
    });
  });

  describe('getTopWeaknesses', () => {
    it('should return top N lowest scoring items', () => {
      const items = [
        { itemCode: '1.1', itemName: 'Item 1', score: 5 },
        { itemCode: '1.2', itemName: 'Item 2', score: 4 },
        { itemCode: '1.3', itemName: 'Item 3', score: 3 },
        { itemCode: '1.4', itemName: 'Item 4', score: 2 },
      ];

      const top2 = getTopWeaknesses(items, 2);

      expect(top2).toHaveLength(2);
      expect(top2[0].score).toBe(2);
      expect(top2[1].score).toBe(3);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations based on gaps', () => {
      const gapItems = [
        {
          itemCode: '1.1',
          itemId: '1',
          itemName: 'Item 1',
          currentScore: 1,
          targetScore: 3,
          gap: 2,
          priority: 'HIGH' as const,
          effort: 'HIGH' as const,
          impact: 'HIGH' as const,
        },
        {
          itemCode: '1.2',
          itemId: '2',
          itemName: 'Item 2',
          currentScore: 2,
          targetScore: 3,
          gap: 1,
          priority: 'HIGH' as const,
          effort: 'LOW' as const,
          impact: 'HIGH' as const,
        },
      ];

      const recommendations = generateRecommendations(gapItems);

      expect(recommendations.length).toBeGreaterThan(0);
      // Should mention high priority items
      expect(recommendations.some((r) => r.includes('Ưu tiên cao'))).toBe(true);
      // Should mention quick wins
      expect(recommendations.some((r) => r.includes('Quick wins'))).toBe(true);
    });
  });
});
