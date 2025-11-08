/**
 * Shared TypeScript Types
 */

export type Role = 'OWNER' | 'ADMIN' | 'REVIEWER' | 'RESPONDENT' | 'VIEWER';

export type AssessmentStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'FINALIZED';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  organizationId?: string;
}

export interface Assessment {
  id: string;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
  templateId: string;
  status: AssessmentStatus;
  industry?: string;
  size?: string;
  region?: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
  expiresAt?: Date;
}

export interface Response {
  id: string;
  assessmentId: string;
  itemId: string;
  score: number;
  currentState?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Domain {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  weight: number;
  sortOrder: number;
}

export interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  itemNameEn?: string;
  domainId: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  weight: number;
  sortOrder: number;
  evidenceRequired: boolean;
  evidenceRequiredIfLe?: number;
  allowedFileTypes: string[];
}

export interface Evidence {
  id: string;
  assessmentId: string;
  responseId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  checksum: string;
  virusScanned: boolean;
  uploadedAt: Date;
}
