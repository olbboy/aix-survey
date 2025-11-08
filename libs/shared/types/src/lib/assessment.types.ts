// Assessment-related types and interfaces

export interface Assessment {
  id: string;
  title: string;
  status: AssessmentStatus;
  userId?: string;
  organizationId?: string;
  templateId: string;
  sessionId?: string;
  progress: number;
  responses: AssessmentResponse[];
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  FINALIZED = 'FINALIZED',
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  itemId: string;
  score?: number;
  currentState?: string;
  desiredState?: string;
  evidences: Evidence[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Evidence {
  id: string;
  responseId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  uploadedAt: Date;
  uploadedById?: string;
}

export interface CreateAssessmentInput {
  title: string;
  templateId: string;
  organizationId?: string;
}

export interface UpdateAssessmentInput {
  title?: string;
  status?: AssessmentStatus;
}

export interface SaveResponsesInput {
  responses: Record<string, {
    score?: number;
    currentState?: string;
    desiredState?: string;
  }>;
}
