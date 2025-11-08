import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';
import {
  StartAssessmentDto,
  SaveResponsesDto,
  GenerateUploadUrlDto,
  ConfirmEvidenceDto,
  SendResultsDto,
  CompareAssessmentsDto,
} from './dto';

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start new assessment (guest or authenticated user)
   */
  async startAssessment(dto: StartAssessmentDto, userId?: string) {
    try {
      // Get active template
      const template = await this.prisma.assessmentTemplate.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!template) {
        throw new NotFoundException('No active assessment template found');
      }

      // Create session for guest users
      const sessionId = userId ? undefined : nanoid();
      const expiresAt = userId ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const assessment = await this.prisma.assessment.create({
        data: {
          sessionId,
          userId,
          templateId: template.id,
          industry: dto.industry,
          size: dto.size,
          region: dto.region,
          status: 'IN_PROGRESS',
          expiresAt,
        },
      });

      this.logger.log(`Assessment started: ${assessment.id}`, {
        userId: userId || 'guest',
        sessionId,
      });

      return {
        assessmentId: assessment.id,
        sessionId,
        templateVersion: template.version,
      };
    } catch (error) {
      this.logger.error('Failed to start assessment', error);
      throw error;
    }
  }

  /**
   * Get assessment with template and responses
   */
  async getAssessment(assessmentId: string, userId?: string, sessionId?: string) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          template: {
            include: {
              domains: {
                include: {
                  items: {
                    orderBy: { sortOrder: 'asc' },
                  },
                },
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          responses: {
            include: {
              evidences: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      // Authorization check
      const isOwner = assessment.userId === userId || assessment.sessionId === sessionId;
      if (!isOwner) {
        throw new ForbiddenException('Access denied');
      }

      // Transform responses to map
      const responsesMap = assessment.responses.reduce((acc, response) => {
        acc[response.itemId] = {
          score: response.score,
          currentState: response.currentState || '',
          evidences: response.evidences.map((e) => ({
            id: e.id,
            fileName: e.fileName,
            fileSize: e.fileSize,
            storageUrl: e.storageUrl,
          })),
        };
        return acc;
      }, {} as Record<string, any>);

      return {
        assessment: {
          id: assessment.id,
          status: assessment.status,
          industry: assessment.industry,
          size: assessment.size,
          region: assessment.region,
          templateVersion: assessment.template.version,
          createdAt: assessment.createdAt,
          updatedAt: assessment.updatedAt,
        },
        template: {
          version: assessment.template.version,
          domains: assessment.template.domains.map((domain) => ({
            id: domain.id,
            code: domain.code,
            name: domain.name,
            items: domain.items.map((item) => ({
              id: item.id,
              itemCode: item.itemCode,
              itemName: item.itemName,
              level1: item.level1,
              level2: item.level2,
              level3: item.level3,
              level4: item.level4,
              level5: item.level5,
              weight: item.weight,
              evidenceRequired: item.evidenceRequired,
              evidenceRequiredIfLe: item.evidenceRequiredIfLe,
              allowedFileTypes: item.allowedFileTypes,
            })),
          })),
        },
        responses: responsesMap,
      };
    } catch (error) {
      this.logger.error(`Failed to get assessment ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Save/autosave assessment responses
   */
  async saveResponses(
    assessmentId: string,
    dto: SaveResponsesDto,
    userId?: string,
    sessionId?: string
  ) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { template: true },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      // Authorization
      const isOwner = assessment.userId === userId || assessment.sessionId === sessionId;
      if (!isOwner) {
        throw new ForbiddenException('Access denied');
      }

      // Save to DB (upsert multiple responses)
      await this.prisma.$transaction(
        Object.entries(dto.responses).map(([itemId, response]) =>
          this.prisma.response.upsert({
            where: {
              assessmentId_itemId: {
                assessmentId: assessment.id,
                itemId,
              },
            },
            update: {
              score: response.score,
              currentState: response.currentState,
            },
            create: {
              assessmentId: assessment.id,
              itemId,
              score: response.score,
              currentState: response.currentState,
            },
          })
        )
      );

      // Update assessment timestamp
      await this.prisma.assessment.update({
        where: { id: assessment.id },
        data: { updatedAt: new Date() },
      });

      // Calculate progress
      const totalItems = await this.prisma.item.count({
        where: {
          domain: {
            templateId: assessment.templateId,
          },
        },
      });

      const answeredResponses = await this.prisma.response.count({
        where: {
          assessmentId: assessment.id,
          score: {
            not: null,
            gte: 1,
          },
        },
      });

      const progress = Math.round((answeredResponses / totalItems) * 100);

      this.logger.log(`Responses saved for assessment ${assessmentId}`, {
        responseCount: Object.keys(dto.responses).length,
        progress,
      });

      // TODO: For guest users, also save to Redis for persistence
      // if (assessment.sessionId && !assessment.userId) {
      //   await saveAssessmentDraft(assessment.sessionId, draft);
      //   await saveProgress(assessment.sessionId, progress);
      // }

      return {
        success: true,
        savedAt: new Date().toISOString(),
        progress,
      };
    } catch (error) {
      this.logger.error(`Failed to save responses for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Finalize assessment and create immutable snapshot
   */
  async finalizeAssessment(assessmentId: string, userId?: string, sessionId?: string) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          template: {
            include: {
              domains: {
                include: {
                  items: true,
                },
              },
            },
          },
          responses: true,
        },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      // Authorization
      const isOwner = assessment.userId === userId || assessment.sessionId === sessionId;
      if (!isOwner) {
        throw new ForbiddenException('Access denied');
      }

      // Check if already finalized
      if (assessment.status === 'FINALIZED') {
        const existingSnapshot = await this.prisma.assessmentSnapshot.findUnique({
          where: { assessmentId: assessment.id },
        });

        return {
          message: 'Assessment already finalized',
          snapshotId: existingSnapshot?.id,
        };
      }

      // TODO: Calculate scores using scoring engine
      // For now, use placeholder implementation
      const scores = this.calculateScores(assessment);

      // Validation: Require at least 50% completion
      const MINIMUM_COMPLETION_PERCENTAGE = 50;
      if (scores.completeness < MINIMUM_COMPLETION_PERCENTAGE) {
        throw new BadRequestException({
          error: 'Assessment incomplete',
          message: `Need at least ${MINIMUM_COMPLETION_PERCENTAGE}% completion`,
          completeness: scores.completeness,
          answeredItems: scores.answeredItems,
          totalItems: scores.totalItems,
        });
      }

      if (scores.answeredItems === 0) {
        throw new BadRequestException({
          error: 'No responses found',
          message: 'Please answer at least one question',
        });
      }

      // Create item scores map
      const itemScores: Record<string, number> = {};
      assessment.responses.forEach((response) => {
        if (response.itemId && response.score !== null && response.score >= 1) {
          itemScores[response.itemId] = response.score;
        }
      });

      // Create domain scores map
      const domainScores: Record<string, number> = {};
      scores.domainScores.forEach((ds) => {
        domainScores[ds.domainCode] = ds.averageScore;
      });

      // Create snapshot data
      const snapshotData = {
        assessment: {
          id: assessment.id,
          industry: assessment.industry,
          size: assessment.size,
          region: assessment.region,
        },
        responses: assessment.responses.map((r) => ({
          itemId: r.itemId,
          score: r.score,
          currentState: r.currentState,
        })),
        calculatedAt: new Date().toISOString(),
      };

      // Generate checksum
      const checksum = crypto.createHash('sha256').update(JSON.stringify(snapshotData)).digest('hex');

      // Create snapshot
      const snapshot = await this.prisma.assessmentSnapshot.create({
        data: {
          assessmentId: assessment.id,
          itemScores,
          domainScores,
          totalScore: scores.totalScore,
          maturityLevel: scores.maturityLevel,
          templateVersion: assessment.template.version,
          numResponses: assessment.responses.length,
          completeness: scores.completeness,
          snapshotData,
          checksum,
        },
      });

      // Update assessment status
      await this.prisma.assessment.update({
        where: { id: assessment.id },
        data: {
          status: 'FINALIZED',
          finalizedAt: new Date(),
        },
      });

      this.logger.log(`Assessment finalized: ${assessmentId}`, {
        snapshotId: snapshot.id,
        totalScore: scores.totalScore,
      });

      return {
        snapshotId: snapshot.id,
        scores: {
          itemScores,
          domainScores,
          totalScore: scores.totalScore,
          maturityLevel: scores.maturityLevel,
          maturityLevelEn: scores.maturityLevelEn,
          completeness: scores.completeness,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to finalize assessment ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Get assessment results with analysis
   */
  async getResults(assessmentId: string, userId?: string, sessionId?: string) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          snapshot: true,
          template: {
            include: {
              domains: {
                include: {
                  items: true,
                },
              },
            },
          },
          responses: true,
        },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      // Authorization
      const isOwner = assessment.userId === userId || assessment.sessionId === sessionId;
      if (!isOwner) {
        throw new ForbiddenException('Access denied');
      }

      if (!assessment.snapshot) {
        throw new BadRequestException('Assessment not finalized yet');
      }

      // Get itemScores from snapshot
      let itemScores = assessment.snapshot.itemScores as Record<string, number>;

      // Fallback if itemScores is empty
      if (!itemScores || Object.keys(itemScores).length === 0) {
        itemScores = {};
        assessment.responses.forEach((response) => {
          if (response.itemId && response.score !== null && response.score >= 1) {
            itemScores[response.itemId] = response.score;
          }
        });
      }

      // Prepare domains with items
      const domains = assessment.template.domains.map((domain) => ({
        code: domain.code,
        name: domain.name,
        items: domain.items
          .map((item) => {
            const score = itemScores[item.id];
            if (score === undefined || score === null || score < 1) {
              return null;
            }
            return {
              itemCode: item.itemCode,
              itemName: item.itemName,
              score: score,
            };
          })
          .filter((item) => item !== null),
      }));

      // TODO: Calculate gaps and recommendations using gap analysis service
      // const gaps = calculateItemGaps(items);
      // const strengths = getTopStrengths(items, 5);
      // const weaknesses = getTopWeaknesses(items, 5);
      // const recommendations = generateRecommendations(gaps);

      return {
        assessment: {
          id: assessment.id,
          status: assessment.status,
          industry: assessment.industry,
          size: assessment.size,
          region: assessment.region,
          finalizedAt: assessment.finalizedAt,
        },
        snapshot: {
          id: assessment.snapshot.id,
          totalScore: assessment.snapshot.totalScore,
          maturityLevel: assessment.snapshot.maturityLevel,
          completeness: assessment.snapshot.completeness,
          domainScores: assessment.snapshot.domainScores,
          itemScores: assessment.snapshot.itemScores,
          createdAt: assessment.snapshot.createdAt,
        },
        domains,
        analysis: {
          strengths: [], // TODO: Implement gap analysis
          weaknesses: [], // TODO: Implement gap analysis
          gaps: [], // TODO: Implement gap analysis
          recommendations: {}, // TODO: Implement recommendations
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get results for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * List evidence for assessment
   */
  async listEvidence(assessmentId: string) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: { id: true },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      const evidences = await this.prisma.evidence.findMany({
        where: { assessmentId },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          itemCode: true,
          description: true,
          uploadedAt: true,
          uploadedBy: true,
          storageUrl: true,
          virusScanned: true,
          scanResult: true,
        },
        orderBy: {
          uploadedAt: 'desc',
        },
      });

      return {
        assessmentId,
        count: evidences.length,
        evidences,
      };
    } catch (error) {
      this.logger.error(`Failed to list evidence for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Generate presigned upload URL
   */
  async generateUploadUrl(assessmentId: string, dto: GenerateUploadUrlDto) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      // Check assessment status
      if (!['DRAFT', 'IN_PROGRESS'].includes(assessment.status)) {
        throw new BadRequestException('Evidence can only be uploaded for draft or in-progress assessments');
      }

      // TODO: Validate file type and size
      // const validation = validateFile(dto.fileName, dto.fileType, dto.fileSize);

      // TODO: Generate presigned URL using storage service
      // const presignedData = await storage.getPresignedUploadUrl({ ... });

      // Placeholder implementation
      const fileKey = `assessments/${assessmentId}/evidence/${nanoid()}-${dto.fileName}`;

      return {
        uploadUrl: `https://storage.example.com/upload/${fileKey}`, // Placeholder
        fileKey,
        expiresIn: 3600,
        assessmentId,
        itemCode: dto.itemCode,
      };
    } catch (error) {
      this.logger.error(`Failed to generate upload URL for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Confirm evidence upload
   */
  async confirmEvidence(assessmentId: string, dto: ConfirmEvidenceDto, userId?: string) {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found');
      }

      // Create evidence record
      const evidence = await this.prisma.evidence.create({
        data: {
          assessmentId,
          fileName: dto.fileName,
          fileType: dto.fileType,
          fileSize: dto.fileSize,
          itemCode: dto.itemCode,
          description: dto.description,
          storageUrl: dto.fileKey,
          uploadedBy: userId || assessment.sessionId || 'guest',
          virusScanned: dto.virusScanned || false,
          scanResult: dto.scanResult || 'PENDING',
        },
      });

      this.logger.log(`Evidence confirmed for assessment ${assessmentId}`, {
        evidenceId: evidence.id,
        fileName: dto.fileName,
      });

      return evidence;
    } catch (error) {
      this.logger.error(`Failed to confirm evidence for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(assessmentId: string, evidenceId: string) {
    try {
      const evidence = await this.prisma.evidence.findUnique({
        where: { id: evidenceId },
      });

      if (!evidence || evidence.assessmentId !== assessmentId) {
        throw new NotFoundException('Evidence not found');
      }

      // TODO: Delete from storage
      // await storage.deleteFile(evidence.storageUrl);

      await this.prisma.evidence.delete({
        where: { id: evidenceId },
      });

      this.logger.log(`Evidence deleted: ${evidenceId}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete evidence ${evidenceId}`, error);
      throw error;
    }
  }

  /**
   * Download evidence
   */
  async downloadEvidence(assessmentId: string, evidenceId: string) {
    try {
      const evidence = await this.prisma.evidence.findUnique({
        where: { id: evidenceId },
      });

      if (!evidence || evidence.assessmentId !== assessmentId) {
        throw new NotFoundException('Evidence not found');
      }

      // TODO: Generate presigned download URL
      // const downloadUrl = await storage.getPresignedDownloadUrl(evidence.storageUrl);

      return {
        downloadUrl: `https://storage.example.com/download/${evidence.storageUrl}`, // Placeholder
        fileName: evidence.fileName,
        fileSize: evidence.fileSize,
        expiresIn: 3600,
      };
    } catch (error) {
      this.logger.error(`Failed to generate download URL for evidence ${evidenceId}`, error);
      throw error;
    }
  }

  /**
   * Export assessment as PDF
   */
  async exportPdf(assessmentId: string) {
    try {
      // TODO: Implement PDF export using pdf-service
      // const pdfBuffer = await generateAssessmentPDF(data);

      throw new BadRequestException('PDF export not yet implemented');
    } catch (error) {
      this.logger.error(`Failed to export PDF for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Export assessment as CSV
   */
  async exportCsv(assessmentId: string) {
    try {
      // TODO: Implement CSV export
      throw new BadRequestException('CSV export not yet implemented');
    } catch (error) {
      this.logger.error(`Failed to export CSV for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Send assessment results via email
   */
  async sendResults(assessmentId: string, dto: SendResultsDto) {
    try {
      // TODO: Implement email service integration
      // await emailService.sendAssessmentResults(...)

      this.logger.log(`Results sent for assessment ${assessmentId} to ${dto.email}`);

      return { success: true, message: 'Results sent successfully' };
    } catch (error) {
      this.logger.error(`Failed to send results for ${assessmentId}`, error);
      throw error;
    }
  }

  /**
   * Compare two assessments
   */
  async compareAssessments(dto: CompareAssessmentsDto) {
    try {
      // Return suggested comparisons if organizationId provided
      if (!dto.from && !dto.to && dto.organizationId) {
        // TODO: Implement getSuggestedComparisons
        return { suggestions: [] };
      }

      if (!dto.from || !dto.to) {
        throw new BadRequestException('Both from and to assessment IDs are required');
      }

      if (dto.from === dto.to) {
        throw new BadRequestException('Cannot compare an assessment with itself');
      }

      // TODO: Implement comparison logic
      // const comparison = await compareAssessments(dto.from, dto.to);

      throw new BadRequestException('Assessment comparison not yet implemented');
    } catch (error) {
      this.logger.error('Failed to compare assessments', error);
      throw error;
    }
  }

  /**
   * Compare assessment to industry benchmarks
   */
  async compareToBenchmarks(assessmentId: string) {
    try {
      // TODO: Implement benchmark comparison
      // const comparison = await compareAssessmentToBenchmarks(assessmentId);

      throw new BadRequestException('Benchmark comparison not yet implemented');
    } catch (error) {
      this.logger.error(`Failed to compare assessment ${assessmentId} to benchmarks`, error);
      throw error;
    }
  }

  // =================================================================
  // PRIVATE HELPER METHODS
  // =================================================================

  /**
   * Calculate scores (placeholder implementation)
   * TODO: Replace with actual scoring engine
   */
  private calculateScores(assessment: any) {
    const domainData = assessment.template.domains.map((domain: any) => {
      const items = domain.items
        .map((item: any) => {
          const response = assessment.responses.find((r: any) => r.itemId === item.id);
          if (!response || response.score === null || response.score < 1) {
            return null;
          }
          return {
            itemCode: item.itemCode,
            itemId: item.id,
            score: response.score,
            weight: item.weight,
          };
        })
        .filter((item: any) => item !== null);

      return {
        domainCode: domain.code,
        domainId: domain.id,
        domainName: domain.name,
        domainWeight: domain.weight,
        totalItems: domain.items.length,
        items,
      };
    });

    // Calculate basic statistics
    const totalItems = domainData.reduce((sum: number, d: any) => sum + d.totalItems, 0);
    const answeredItems = domainData.reduce((sum: number, d: any) => sum + d.items.length, 0);
    const completeness = totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

    // Calculate domain scores
    const domainScores = domainData.map((d: any) => {
      const scores = d.items.map((i: any) => i.score);
      const averageScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
      return {
        domainCode: d.domainCode,
        averageScore: Math.round(averageScore * 100) / 100,
      };
    });

    // Calculate total score (simple average for now)
    const totalScore =
      domainScores.length > 0
        ? Math.round((domainScores.reduce((sum, ds) => sum + ds.averageScore, 0) / domainScores.length) * 100) / 100
        : 0;

    // Determine maturity level
    const maturityLevel = this.getMaturityLevel(totalScore);
    const maturityLevelEn = this.getMaturityLevelEn(totalScore);

    return {
      totalScore,
      maturityLevel,
      maturityLevelEn,
      completeness,
      answeredItems,
      totalItems,
      domainScores,
    };
  }

  private getMaturityLevel(score: number): string {
    if (score >= 4.5) return 'Tối ưu';
    if (score >= 3.5) return 'Quản lý';
    if (score >= 2.5) return 'Định nghĩa';
    if (score >= 1.5) return 'Lặp lại';
    return 'Sơ khai';
  }

  private getMaturityLevelEn(score: number): string {
    if (score >= 4.5) return 'Optimized';
    if (score >= 3.5) return 'Managed';
    if (score >= 2.5) return 'Defined';
    if (score >= 1.5) return 'Repeatable';
    return 'Initial';
  }
}
