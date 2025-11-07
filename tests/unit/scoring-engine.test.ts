/**
 * Unit Tests for Scoring Engine
 */

import {
  calculateDomainScore,
  calculateTotalScore,
  getMaturityLevel,
  calculateCompleteness,
  calculateAssessmentScore,
  validateAssessmentCompleteness,
} from '@/lib/scoring/scoring-engine';

describe('Scoring Engine', () => {
  describe('calculateDomainScore', () => {
    it('should calculate simple average when no weights', () => {
      const items = [
        { score: 3, weight: 1 },
        { score: 4, weight: 1 },
        { score: 5, weight: 1 },
      ];
      expect(calculateDomainScore(items)).toBe(4);
    });

    it('should calculate weighted average when weights provided', () => {
      const items = [
        { score: 3, weight: 1 },
        { score: 4, weight: 2 },
        { score: 5, weight: 1 },
      ];
      // (3*1 + 4*2 + 5*1) / (1+2+1) = 16/4 = 4
      expect(calculateDomainScore(items)).toBe(4);
    });

    it('should return 0 for empty items', () => {
      expect(calculateDomainScore([])).toBe(0);
    });

    it('should handle single item', () => {
      const items = [{ score: 3, weight: 1 }];
      expect(calculateDomainScore(items)).toBe(3);
    });
  });

  describe('calculateTotalScore', () => {
    it('should calculate average of domain scores', () => {
      const domains = [
        { score: 3.0, weight: 1 },
        { score: 4.0, weight: 1 },
        { score: 3.5, weight: 1 },
      ];
      expect(calculateTotalScore(domains)).toBeCloseTo(3.5, 1);
    });

    it('should calculate weighted average when weights provided', () => {
      const domains = [
        { score: 3.0, weight: 2 },
        { score: 5.0, weight: 1 },
      ];
      // (3*2 + 5*1) / (2+1) = 11/3 = 3.67
      expect(calculateTotalScore(domains)).toBeCloseTo(3.67, 2);
    });

    it('should return 0 for empty domains', () => {
      expect(calculateTotalScore([])).toBe(0);
    });
  });

  describe('getMaturityLevel', () => {
    it('should return "Sơ khai" for score 1.0-1.5', () => {
      expect(getMaturityLevel(1.0).label).toBe('Sơ khai');
      expect(getMaturityLevel(1.5).label).toBe('Sơ khai');
    });

    it('should return "Khởi đầu" for score 1.6-2.5', () => {
      expect(getMaturityLevel(1.6).label).toBe('Khởi đầu');
      expect(getMaturityLevel(2.0).label).toBe('Khởi đầu');
      expect(getMaturityLevel(2.5).label).toBe('Khởi đầu');
    });

    it('should return "Phát triển" for score 2.6-3.5', () => {
      expect(getMaturityLevel(2.6).label).toBe('Phát triển');
      expect(getMaturityLevel(3.0).label).toBe('Phát triển');
      expect(getMaturityLevel(3.5).label).toBe('Phát triển');
    });

    it('should return "Trưởng thành" for score 3.6-4.5', () => {
      expect(getMaturityLevel(3.6).label).toBe('Trưởng thành');
      expect(getMaturityLevel(4.0).label).toBe('Trưởng thành');
      expect(getMaturityLevel(4.5).label).toBe('Trưởng thành');
    });

    it('should return "Tối ưu" for score 4.6-5.0', () => {
      expect(getMaturityLevel(4.6).label).toBe('Tối ưu');
      expect(getMaturityLevel(5.0).label).toBe('Tối ưu');
    });
  });

  describe('calculateCompleteness', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateCompleteness(10, 20)).toBe(50);
      expect(calculateCompleteness(15, 20)).toBe(75);
      expect(calculateCompleteness(20, 20)).toBe(100);
    });

    it('should return 0 for 0 total items', () => {
      expect(calculateCompleteness(0, 0)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculateCompleteness(1, 3)).toBe(33); // 33.33... → 33
      expect(calculateCompleteness(2, 3)).toBe(67); // 66.66... → 67
    });
  });

  describe('calculateAssessmentScore', () => {
    it('should calculate full assessment score correctly', () => {
      const domainData = [
        {
          domainCode: 'data',
          domainId: '1',
          domainName: 'Dữ liệu',
          domainWeight: 1,
          totalItems: 3,
          items: [
            { itemCode: '1.1', itemId: '1', score: 3, weight: 1 },
            { itemCode: '1.2', itemId: '2', score: 4, weight: 1 },
            { itemCode: '1.3', itemId: '3', score: 5, weight: 1 },
          ],
        },
        {
          domainCode: 'infra',
          domainId: '2',
          domainName: 'Hạ tầng',
          domainWeight: 1,
          totalItems: 2,
          items: [
            { itemCode: '2.1', itemId: '4', score: 4, weight: 1 },
            { itemCode: '2.2', itemId: '5', score: 4, weight: 1 },
          ],
        },
      ];

      const result = calculateAssessmentScore(domainData);

      // Domain 1: (3+4+5)/3 = 4.0
      // Domain 2: (4+4)/2 = 4.0
      // Total: (4.0+4.0)/2 = 4.0
      expect(result.domainScores[0].averageScore).toBe(4.0);
      expect(result.domainScores[1].averageScore).toBe(4.0);
      expect(result.totalScore).toBe(4.0);
      expect(result.maturityLevel).toBe('Trưởng thành');
      expect(result.completeness).toBe(100); // 5/5 items
    });

    it('should handle incomplete assessments', () => {
      const domainData = [
        {
          domainCode: 'data',
          domainId: '1',
          domainName: 'Dữ liệu',
          domainWeight: 1,
          totalItems: 5, // 5 total but only 2 answered
          items: [
            { itemCode: '1.1', itemId: '1', score: 3, weight: 1 },
            { itemCode: '1.2', itemId: '2', score: 4, weight: 1 },
          ],
        },
      ];

      const result = calculateAssessmentScore(domainData);

      expect(result.answeredItems).toBe(2);
      expect(result.totalItems).toBe(5);
      expect(result.completeness).toBe(40); // 2/5 = 40%
      expect(result.domainScores[0].completeness).toBe(40);
    });

    it('should round scores to 2 decimal places', () => {
      const domainData = [
        {
          domainCode: 'data',
          domainId: '1',
          domainName: 'Dữ liệu',
          domainWeight: 1,
          totalItems: 3,
          items: [
            { itemCode: '1.1', itemId: '1', score: 2, weight: 1 },
            { itemCode: '1.2', itemId: '2', score: 3, weight: 1 },
            { itemCode: '1.3', itemId: '3', score: 4, weight: 1 },
          ],
        },
      ];

      const result = calculateAssessmentScore(domainData);

      // (2+3+4)/3 = 3.0
      expect(result.domainScores[0].averageScore).toBe(3.0);
      expect(result.totalScore).toBe(3.0);
    });
  });

  describe('validateAssessmentCompleteness', () => {
    it('should return valid for 100% complete assessment', () => {
      const score = {
        domainScores: [
          {
            domainCode: 'data',
            domainId: '1',
            domainName: 'Dữ liệu',
            itemScores: [],
            averageScore: 4.0,
            weightedScore: 4.0,
            weight: 1,
            completeness: 100,
          },
        ],
        totalScore: 4.0,
        weightedTotalScore: 4.0,
        maturityLevel: 'Trưởng thành',
        maturityLevelEn: 'Mature',
        completeness: 100,
        totalItems: 10,
        answeredItems: 10,
      };

      const result = validateAssessmentCompleteness(score);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return warnings for incomplete assessment', () => {
      const score = {
        domainScores: [
          {
            domainCode: 'data',
            domainId: '1',
            domainName: 'Dữ liệu',
            itemScores: [],
            averageScore: 4.0,
            weightedScore: 4.0,
            weight: 1,
            completeness: 60,
          },
        ],
        totalScore: 4.0,
        weightedTotalScore: 4.0,
        maturityLevel: 'Trưởng thành',
        maturityLevelEn: 'Mature',
        completeness: 75,
        totalItems: 10,
        answeredItems: 7,
      };

      const result = validateAssessmentCompleteness(score);
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('75%');
    });
  });
});
