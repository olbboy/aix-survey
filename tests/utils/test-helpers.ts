/**
 * Test Utilities and Helpers
 * Common functions for testing assessment flow
 */

export interface MockAssessmentData {
  industry: string;
  size: string;
  region: string;
}

export interface MockResponse {
  score: number;
  currentState: string;
}

/**
 * Generate mock assessment data
 */
export function createMockAssessmentData(): MockAssessmentData {
  return {
    industry: 'technology',
    size: 'medium',
    region: 'vietnam',
  };
}

/**
 * Generate mock responses for testing
 */
export function createMockResponses(count: number = 37): Record<string, MockResponse> {
  const responses: Record<string, MockResponse> = {};

  for (let i = 1; i <= count; i++) {
    responses[`item-${i}`] = {
      score: Math.floor(Math.random() * 3) + 2, // Random score 2-4
      currentState: `Mock current state for item ${i}`,
    };
  }

  return responses;
}

/**
 * Generate realistic mock responses with variety
 */
export function createRealisticMockResponses(): Record<string, MockResponse> {
  const responses: Record<string, MockResponse> = {};

  // Data domain (items 1-8): Mixed scores
  for (let i = 1; i <= 8; i++) {
    responses[`item-${i}`] = {
      score: i % 3 + 2, // Scores 2, 3, 4 pattern
      currentState: `Data domain: Current state for item ${i}`,
    };
  }

  // Infrastructure domain (items 9-16): Higher scores
  for (let i = 9; i <= 16; i++) {
    responses[`item-${i}`] = {
      score: 4,
      currentState: `Infrastructure: Well established for item ${i}`,
    };
  }

  // Technology domain (items 17-24): Lower scores
  for (let i = 17; i <= 24; i++) {
    responses[`item-${i}`] = {
      score: 2,
      currentState: `Technology: Early stage adoption for item ${i}`,
    };
  }

  // Organization domain (items 25-31): Mixed
  for (let i = 25; i <= 31; i++) {
    responses[`item-${i}`] = {
      score: 3,
      currentState: `Organization: Developing capabilities for item ${i}`,
    };
  }

  // Policy domain (items 32-37): Good scores
  for (let i = 32; i <= 37; i++) {
    responses[`item-${i}`] = {
      score: 4,
      currentState: `Policy: Good framework in place for item ${i}`,
    };
  }

  return responses;
}

/**
 * Create partial responses (for testing progress)
 */
export function createPartialResponses(percentage: number): Record<string, MockResponse> {
  const totalItems = 37;
  const itemCount = Math.floor(totalItems * (percentage / 100));

  const responses: Record<string, MockResponse> = {};
  for (let i = 1; i <= itemCount; i++) {
    responses[`item-${i}`] = {
      score: 3,
      currentState: `Partial response ${i}`,
    };
  }

  return responses;
}

/**
 * Validate assessment response structure
 */
export function validateAssessmentResponse(data: any): boolean {
  return (
    data &&
    typeof data.assessmentId === 'string' &&
    typeof data.templateVersion === 'string' &&
    (typeof data.sessionId === 'string' || typeof data.sessionId === 'undefined')
  );
}

/**
 * Validate template structure
 */
export function validateTemplateStructure(template: any): boolean {
  if (!template || !Array.isArray(template.domains)) {
    return false;
  }

  if (template.domains.length !== 5) {
    return false;
  }

  const totalItems = template.domains.reduce(
    (sum: number, domain: any) => sum + (domain.items?.length || 0),
    0
  );

  return totalItems === 37;
}

/**
 * Validate scores structure
 */
export function validateScoresStructure(scores: any): boolean {
  return (
    scores &&
    typeof scores.totalScore === 'number' &&
    scores.totalScore >= 1 &&
    scores.totalScore <= 5 &&
    typeof scores.maturityLevel === 'string' &&
    typeof scores.completeness === 'number' &&
    scores.completeness >= 0 &&
    scores.completeness <= 100
  );
}

/**
 * Validate gap analysis structure
 */
export function validateGapAnalysis(gap: any): boolean {
  const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
  const validEfforts = ['LOW', 'MEDIUM', 'HIGH'];
  const validImpacts = ['LOW', 'MEDIUM', 'HIGH'];

  return (
    gap &&
    typeof gap.itemCode === 'string' &&
    typeof gap.currentScore === 'number' &&
    typeof gap.targetScore === 'number' &&
    typeof gap.gap === 'number' &&
    validPriorities.includes(gap.priority) &&
    validEfforts.includes(gap.effort) &&
    validImpacts.includes(gap.impact)
  );
}

/**
 * Calculate expected progress
 */
export function calculateExpectedProgress(responsesCount: number): number {
  return Math.round((responsesCount / 37) * 100);
}

/**
 * Get expected maturity level for score
 */
export function getExpectedMaturityLevel(score: number): string {
  if (score >= 4.6) return 'Tối ưu';
  if (score >= 3.6) return 'Trưởng thành';
  if (score >= 2.6) return 'Phát triển';
  if (score >= 1.6) return 'Khởi đầu';
  return 'Sơ khai';
}

/**
 * Create mock cookie header
 */
export function createCookieHeader(sessionId: string): string {
  return `assessment_session=${sessionId}`;
}

/**
 * Extract session ID from cookie header
 */
export function extractSessionId(cookieHeader: string): string | null {
  const match = cookieHeader.match(/assessment_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Wait for async operation (useful for debounce testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate test assessment metadata
 */
export function generateTestMetadata(index: number = 1) {
  const industries = ['technology', 'finance', 'healthcare', 'retail', 'manufacturing'];
  const sizes = ['small', 'medium', 'large', 'enterprise'];
  const regions = ['vietnam', 'sea', 'asia', 'global'];

  return {
    industry: industries[index % industries.length],
    size: sizes[index % sizes.length],
    region: regions[index % regions.length],
  };
}

/**
 * Mock user session for authenticated tests
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function createMockUser(index: number = 1): MockUser {
  return {
    id: `user-${index}`,
    email: `testuser${index}@example.com`,
    name: `Test User ${index}`,
    role: 'RESPONDENT',
  };
}

/**
 * Verify error response structure
 */
export function validateErrorResponse(data: any): boolean {
  return (
    data &&
    typeof data.error === 'string' &&
    data.error.length > 0
  );
}

/**
 * Generate random item scores for testing
 */
export function generateRandomScores(count: number = 37): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 5) + 1);
}

/**
 * Calculate average score from array
 */
export function calculateAverageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
}

/**
 * Mock evidence data
 */
export interface MockEvidence {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function createMockEvidence(index: number = 1): MockEvidence {
  return {
    fileName: `evidence-${index}.pdf`,
    fileSize: 1024 * 100, // 100KB
    mimeType: 'application/pdf',
  };
}
