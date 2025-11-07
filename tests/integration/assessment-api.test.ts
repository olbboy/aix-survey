/**
 * API Integration Tests for Assessment Flow
 * Tests critical API endpoints with realistic scenarios
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

// Mock data for testing
const mockAssessmentData = {
  industry: 'technology',
  size: 'medium',
  region: 'vietnam',
};

const mockResponses = {
  'item-1': { score: 3, currentState: 'We have basic data validation' },
  'item-2': { score: 4, currentState: 'Infrastructure is well established' },
  'item-3': { score: 2, currentState: 'AI technology adoption is in early stages' },
};

describe('Assessment API Integration Tests', () => {
  describe('POST /api/assessments/start', () => {
    it('should create assessment for guest user', async () => {
      const response = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('assessmentId');
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('templateVersion');
      expect(typeof data.assessmentId).toBe('string');
      expect(typeof data.sessionId).toBe('string');
    });

    it('should reject invalid industry', async () => {
      const invalidData = { ...mockAssessmentData, industry: 'invalid_industry' };
      const response = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should set assessment session cookie for guest', async () => {
      const response = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });

      const cookies = response.headers.get('set-cookie');
      expect(cookies).toContain('assessment_session');
    });
  });

  describe('GET /api/assessments/[id]', () => {
    let assessmentId: string;
    let sessionCookie: string;

    beforeAll(async () => {
      // Create assessment first
      const createResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });
      const createData = await createResponse.json();
      assessmentId = createData.assessmentId;
      sessionCookie = createResponse.headers.get('set-cookie') || '';
    });

    it('should retrieve assessment with template data', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { Cookie: sessionCookie },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('assessment');
      expect(data).toHaveProperty('template');
      expect(data).toHaveProperty('responses');

      expect(data.template).toHaveProperty('domains');
      expect(Array.isArray(data.template.domains)).toBe(true);
      expect(data.template.domains.length).toBe(5); // 5 domains
    });

    it('should include all 37 assessment items', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        headers: { Cookie: sessionCookie },
      });

      const data = await response.json();
      const totalItems = data.template.domains.reduce(
        (sum: number, domain: any) => sum + domain.items.length,
        0
      );

      expect(totalItems).toBe(37);
    });

    it('should reject unauthorized access', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}`);
      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent assessment', async () => {
      const response = await fetch('/api/assessments/non-existent-id', {
        headers: { Cookie: sessionCookie },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/assessments/[id]/responses', () => {
    let assessmentId: string;
    let sessionCookie: string;

    beforeAll(async () => {
      const createResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });
      const createData = await createResponse.json();
      assessmentId = createData.assessmentId;
      sessionCookie = createResponse.headers.get('set-cookie') || '';
    });

    it('should save responses successfully', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ responses: mockResponses }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('savedAt');
      expect(data).toHaveProperty('progress');
      expect(typeof data.progress).toBe('number');
    });

    it('should calculate progress correctly', async () => {
      const partialResponses = {
        'item-1': { score: 3, currentState: '' },
        'item-2': { score: 4, currentState: '' },
      };

      const response = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ responses: partialResponses }),
      });

      const data = await response.json();
      // 2 out of 37 items = ~5.4%
      expect(data.progress).toBeGreaterThan(0);
      expect(data.progress).toBeLessThan(10);
    });

    it('should reject invalid score values', async () => {
      const invalidResponses = {
        'item-1': { score: 6, currentState: '' }, // Score > 5
      };

      const response = await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ responses: invalidResponses }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/assessments/[id]/finalize', () => {
    let assessmentId: string;
    let sessionCookie: string;

    beforeAll(async () => {
      // Create assessment and add responses
      const createResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });
      const createData = await createResponse.json();
      assessmentId = createData.assessmentId;
      sessionCookie = createResponse.headers.get('set-cookie') || '';

      // Add at least 50% responses
      const responses: any = {};
      for (let i = 1; i <= 20; i++) {
        responses[`item-${i}`] = { score: 3, currentState: '' };
      }

      await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ responses }),
      });
    });

    it('should finalize assessment and create snapshot', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('snapshotId');
      expect(data).toHaveProperty('scores');
      expect(data.scores).toHaveProperty('totalScore');
      expect(data.scores).toHaveProperty('maturityLevel');
      expect(data.scores).toHaveProperty('completeness');

      // Verify maturity level is valid
      const validLevels = ['Sơ khai', 'Khởi đầu', 'Phát triển', 'Trưởng thành', 'Tối ưu'];
      expect(validLevels).toContain(data.scores.maturityLevel);
    });

    it('should prevent duplicate finalization', async () => {
      // Finalize once
      await fetch(`/api/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });

      // Try to finalize again
      const response = await fetch(`/api/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });

      const data = await response.json();
      expect(data).toHaveProperty('message', 'Assessment already finalized');
    });

    it('should include domain scores breakdown', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });

      const data = await response.json();
      expect(data.scores).toHaveProperty('domainScores');
      expect(typeof data.scores.domainScores).toBe('object');

      // Should have scores for all 5 domains
      const domainCodes = Object.keys(data.scores.domainScores);
      expect(domainCodes.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/assessments/[id]/results', () => {
    let assessmentId: string;
    let sessionCookie: string;

    beforeAll(async () => {
      // Create, fill, and finalize assessment
      const createResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });
      const createData = await createResponse.json();
      assessmentId = createData.assessmentId;
      sessionCookie = createResponse.headers.get('set-cookie') || '';

      // Add responses
      const responses: any = {};
      for (let i = 1; i <= 37; i++) {
        responses[`item-${i}`] = {
          score: Math.floor(Math.random() * 3) + 2, // Random 2-4
          currentState: `Test state ${i}`
        };
      }

      await fetch(`/api/assessments/${assessmentId}/responses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: sessionCookie,
        },
        body: JSON.stringify({ responses }),
      });

      // Finalize
      await fetch(`/api/assessments/${assessmentId}/finalize`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });
    });

    it('should return comprehensive results with analysis', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}/results`, {
        headers: { Cookie: sessionCookie },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('assessment');
      expect(data).toHaveProperty('snapshot');
      expect(data).toHaveProperty('analysis');

      expect(data.analysis).toHaveProperty('strengths');
      expect(data.analysis).toHaveProperty('weaknesses');
      expect(data.analysis).toHaveProperty('gaps');
      expect(data.analysis).toHaveProperty('recommendations');
    });

    it('should return top 5 strengths and weaknesses', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}/results`, {
        headers: { Cookie: sessionCookie },
      });

      const data = await response.json();

      expect(Array.isArray(data.analysis.strengths)).toBe(true);
      expect(Array.isArray(data.analysis.weaknesses)).toBe(true);
      expect(data.analysis.strengths.length).toBeLessThanOrEqual(5);
      expect(data.analysis.weaknesses.length).toBeLessThanOrEqual(5);
    });

    it('should provide gap analysis with priorities', async () => {
      const response = await fetch(`/api/assessments/${assessmentId}/results`, {
        headers: { Cookie: sessionCookie },
      });

      const data = await response.json();

      expect(Array.isArray(data.analysis.gaps)).toBe(true);

      if (data.analysis.gaps.length > 0) {
        const gap = data.analysis.gaps[0];
        expect(gap).toHaveProperty('itemCode');
        expect(gap).toHaveProperty('currentScore');
        expect(gap).toHaveProperty('targetScore');
        expect(gap).toHaveProperty('gap');
        expect(gap).toHaveProperty('priority');
        expect(gap).toHaveProperty('effort');
        expect(gap).toHaveProperty('impact');

        const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
        expect(validPriorities).toContain(gap.priority);
      }
    });

    it('should fail for non-finalized assessment', async () => {
      // Create new assessment without finalizing
      const createResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAssessmentData),
      });
      const createData = await createResponse.json();
      const newSessionCookie = createResponse.headers.get('set-cookie') || '';

      const response = await fetch(`/api/assessments/${createData.assessmentId}/results`, {
        headers: { Cookie: newSessionCookie },
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not finalized');
    });
  });
});

describe('Assessment Flow - End-to-End', () => {
  it('should complete full assessment lifecycle', async () => {
    // Step 1: Create assessment
    const createResponse = await fetch('/api/assessments/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockAssessmentData),
    });

    expect(createResponse.status).toBe(200);
    const { assessmentId, sessionId } = await createResponse.json();
    const sessionCookie = createResponse.headers.get('set-cookie') || '';

    // Step 2: Get template data
    const getResponse = await fetch(`/api/assessments/${assessmentId}`, {
      headers: { Cookie: sessionCookie },
    });

    expect(getResponse.status).toBe(200);
    const { template } = await getResponse.json();

    // Step 3: Fill responses (50%+)
    const responses: any = {};
    let itemCount = 0;
    for (const domain of template.domains) {
      for (const item of domain.items) {
        if (itemCount < 20) { // Fill 20 out of 37
          responses[item.id] = {
            score: 3,
            currentState: `Test response for ${item.itemCode}`,
          };
          itemCount++;
        }
      }
    }

    const saveResponse = await fetch(`/api/assessments/${assessmentId}/responses`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ responses }),
    });

    expect(saveResponse.status).toBe(200);
    const { progress } = await saveResponse.json();
    expect(progress).toBeGreaterThanOrEqual(50);

    // Step 4: Finalize assessment
    const finalizeResponse = await fetch(`/api/assessments/${assessmentId}/finalize`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    });

    expect(finalizeResponse.status).toBe(200);
    const { snapshotId, scores } = await finalizeResponse.json();
    expect(snapshotId).toBeDefined();
    expect(scores.totalScore).toBeGreaterThan(0);
    expect(scores.totalScore).toBeLessThanOrEqual(5);

    // Step 5: Get results
    const resultsResponse = await fetch(`/api/assessments/${assessmentId}/results`, {
      headers: { Cookie: sessionCookie },
    });

    expect(resultsResponse.status).toBe(200);
    const { analysis } = await resultsResponse.json();
    expect(analysis.strengths).toBeDefined();
    expect(analysis.weaknesses).toBeDefined();
    expect(analysis.gaps).toBeDefined();
    expect(analysis.recommendations).toBeDefined();
    expect(analysis.recommendations.length).toBeGreaterThan(0);
  });
});
