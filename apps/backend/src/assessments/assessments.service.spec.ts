import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { PrismaService } from '@aix-survey/database';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    assessmentTemplate: {
      findFirst: jest.fn(),
    },
    assessment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    response: {
      upsert: jest.fn(),
      count: jest.fn(),
    },
    item: {
      count: jest.fn(),
    },
    assessmentSnapshot: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    evidence: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AssessmentsService>(AssessmentsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startAssessment', () => {
    it('should create assessment for authenticated user', async () => {
      const mockTemplate = { id: 'template-1', version: 'v1.0', isActive: true };
      const mockAssessment = {
        id: 'assess-1',
        templateId: 'template-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
      };

      mockPrismaService.assessmentTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrismaService.assessment.create.mockResolvedValue(mockAssessment);

      const result = await service.startAssessment(
        { industry: 'Tech', size: 'Medium', region: 'Asia' },
        'user-1'
      );

      expect(result).toEqual({
        assessmentId: 'assess-1',
        sessionId: undefined,
        templateVersion: 'v1.0',
      });
      expect(mockPrismaService.assessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          sessionId: undefined,
          templateId: 'template-1',
          industry: 'Tech',
          size: 'Medium',
          region: 'Asia',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should create assessment for guest user with sessionId', async () => {
      const mockTemplate = { id: 'template-1', version: 'v1.0', isActive: true };
      const mockAssessment = {
        id: 'assess-1',
        templateId: 'template-1',
        sessionId: 'guest-session-123',
        status: 'IN_PROGRESS',
      };

      mockPrismaService.assessmentTemplate.findFirst.mockResolvedValue(mockTemplate);
      mockPrismaService.assessment.create.mockResolvedValue(mockAssessment);

      const result = await service.startAssessment({});

      expect(result.sessionId).toBeDefined();
      expect(result.assessmentId).toBe('assess-1');
      expect(mockPrismaService.assessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: undefined,
          sessionId: expect.any(String),
          status: 'IN_PROGRESS',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when no active template found', async () => {
      mockPrismaService.assessmentTemplate.findFirst.mockResolvedValue(null);

      await expect(service.startAssessment({})).rejects.toThrow(NotFoundException);
      await expect(service.startAssessment({})).rejects.toThrow('No active assessment template found');
    });
  });

  describe('getAssessment', () => {
    it('should return assessment for owner', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        template: {
          version: 'v1.0',
          domains: [
            {
              id: 'domain-1',
              code: 'DATA',
              name: 'Data Domain',
              items: [
                {
                  id: 'item-1',
                  itemCode: 'DATA_01',
                  itemName: 'Data Quality',
                  level1: 'Basic',
                  level2: 'Intermediate',
                  level3: 'Advanced',
                  level4: 'Expert',
                  level5: 'Master',
                  weight: 1,
                  sortOrder: 1,
                },
              ],
              sortOrder: 1,
            },
          ],
        },
        responses: [
          {
            itemId: 'item-1',
            score: 3,
            currentState: 'Good progress',
            evidences: [],
          },
        ],
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const result = await service.getAssessment('assess-1', 'user-1');

      expect(result.assessment.id).toBe('assess-1');
      expect(result.template.domains).toHaveLength(1);
      expect(result.responses['item-1'].score).toBe(3);
    });

    it('should throw NotFoundException when assessment not found', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(null);

      await expect(service.getAssessment('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        sessionId: null,
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(service.getAssessment('assess-1', 'user-2')).rejects.toThrow(ForbiddenException);
    });

    it('should allow access with matching sessionId', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: null,
        sessionId: 'guest-123',
        status: 'IN_PROGRESS',
        template: {
          version: 'v1.0',
          domains: [],
        },
        responses: [],
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const result = await service.getAssessment('assess-1', undefined, 'guest-123');

      expect(result.assessment.id).toBe('assess-1');
    });
  });

  describe('saveResponses', () => {
    it('should save responses and calculate progress', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        templateId: 'template-1',
        template: { version: 'v1.0' },
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.assessment.update.mockResolvedValue(mockAssessment);
      mockPrismaService.item.count.mockResolvedValue(10);
      mockPrismaService.response.count.mockResolvedValue(7);

      const dto = {
        responses: {
          'item-1': { score: 3, currentState: 'Good' },
          'item-2': { score: 4, currentState: 'Excellent' },
        },
      };

      const result = await service.saveResponses('assess-1', dto, 'user-1');

      expect(result.success).toBe(true);
      expect(result.progress).toBe(70); // 7/10 * 100
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        sessionId: null,
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(
        service.saveResponses('assess-1', { responses: {} }, 'user-2')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('finalizeAssessment', () => {
    it('should finalize assessment and create snapshot', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        templateId: 'template-1',
        industry: 'Tech',
        size: 'Medium',
        region: 'Asia',
        template: {
          version: 'v1.0',
          domains: [
            {
              id: 'domain-1',
              code: 'DATA',
              name: 'Data',
              weight: 1,
              items: [
                { id: 'item-1', itemCode: 'DATA_01', weight: 1 },
                { id: 'item-2', itemCode: 'DATA_02', weight: 1 },
              ],
            },
          ],
        },
        responses: [
          { itemId: 'item-1', score: 3, currentState: 'Good' },
          { itemId: 'item-2', score: 4, currentState: 'Excellent' },
        ],
      };

      const mockSnapshot = {
        id: 'snapshot-1',
        assessmentId: 'assess-1',
        totalScore: 3.5,
        maturityLevel: 'Quản lý',
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.assessmentSnapshot.create.mockResolvedValue(mockSnapshot);
      mockPrismaService.assessment.update.mockResolvedValue({
        ...mockAssessment,
        status: 'FINALIZED',
      });

      const result = await service.finalizeAssessment('assess-1', 'user-1');

      expect(result.snapshotId).toBe('snapshot-1');
      expect(result.scores.totalScore).toBeGreaterThan(0);
      expect(result.scores.maturityLevel).toBeDefined();
      expect(mockPrismaService.assessmentSnapshot.create).toHaveBeenCalled();
      expect(mockPrismaService.assessment.update).toHaveBeenCalledWith({
        where: { id: 'assess-1' },
        data: {
          status: 'FINALIZED',
          finalizedAt: expect.any(Date),
        },
      });
    });

    it('should return existing snapshot if already finalized', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'FINALIZED',
      };

      const mockSnapshot = { id: 'snapshot-1' };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.assessmentSnapshot.findUnique.mockResolvedValue(mockSnapshot);

      const result = await service.finalizeAssessment('assess-1', 'user-1');

      expect(result.message).toBe('Assessment already finalized');
      expect(result.snapshotId).toBe('snapshot-1');
    });

    it('should throw BadRequestException when completeness below 50%', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        template: {
          version: 'v1.0',
          domains: [
            {
              id: 'domain-1',
              code: 'DATA',
              weight: 1,
              items: [
                { id: 'item-1', weight: 1 },
                { id: 'item-2', weight: 1 },
                { id: 'item-3', weight: 1 },
                { id: 'item-4', weight: 1 },
              ],
            },
          ],
        },
        responses: [{ itemId: 'item-1', score: 3 }], // Only 25% complete
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(service.finalizeAssessment('assess-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when no answered items', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        template: {
          version: 'v1.0',
          domains: [
            {
              id: 'domain-1',
              code: 'DATA',
              weight: 1,
              items: [{ id: 'item-1', weight: 1 }],
            },
          ],
        },
        responses: [],
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(service.finalizeAssessment('assess-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getResults', () => {
    it('should return results for finalized assessment', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'FINALIZED',
        finalizedAt: new Date(),
        snapshot: {
          id: 'snapshot-1',
          totalScore: 3.75,
          maturityLevel: 'Quản lý',
          completeness: 95,
          domainScores: { DATA: 3.5, INFRA: 4.0 },
          itemScores: { 'item-1': 3, 'item-2': 4 },
          createdAt: new Date(),
        },
        template: {
          version: 'v1.0',
          domains: [
            {
              id: 'domain-1',
              code: 'DATA',
              name: 'Data',
              items: [
                { id: 'item-1', itemCode: 'DATA_01', itemName: 'Data Quality' },
              ],
            },
          ],
        },
        responses: [{ itemId: 'item-1', score: 3 }],
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const result = await service.getResults('assess-1', 'user-1');

      expect(result.assessment.id).toBe('assess-1');
      expect(result.snapshot.totalScore).toBe(3.75);
      expect(result.snapshot.maturityLevel).toBe('Quản lý');
      expect(result.domains).toBeDefined();
    });

    it('should throw BadRequestException when assessment not finalized', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        snapshot: null,
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(service.getResults('assess-1', 'user-1')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.getResults('assess-1', 'user-1')).rejects.toThrow(
        'Assessment not finalized yet'
      );
    });

    it('should rebuild itemScores from responses if snapshot is empty', async () => {
      const mockAssessment = {
        id: 'assess-1',
        userId: 'user-1',
        status: 'FINALIZED',
        snapshot: {
          id: 'snapshot-1',
          totalScore: 3.5,
          maturityLevel: 'Quản lý',
          completeness: 100,
          domainScores: {},
          itemScores: {}, // Empty - will trigger fallback
        },
        template: {
          version: 'v1.0',
          domains: [
            {
              code: 'DATA',
              name: 'Data',
              items: [{ id: 'item-1', itemCode: 'DATA_01', itemName: 'Quality' }],
            },
          ],
        },
        responses: [{ itemId: 'item-1', score: 3 }],
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const result = await service.getResults('assess-1', 'user-1');

      expect(result.domains[0].items).toHaveLength(1);
      expect(result.domains[0].items[0].score).toBe(3);
    });
  });

  describe('listEvidence', () => {
    it('should return list of evidence files', async () => {
      const mockAssessment = { id: 'assess-1' };
      const mockEvidences = [
        {
          id: 'evidence-1',
          fileName: 'document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          uploadedAt: new Date(),
        },
        {
          id: 'evidence-2',
          fileName: 'image.png',
          fileType: 'image/png',
          fileSize: 2048,
          uploadedAt: new Date(),
        },
      ];

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.evidence.findMany.mockResolvedValue(mockEvidences);

      const result = await service.listEvidence('assess-1');

      expect(result.assessmentId).toBe('assess-1');
      expect(result.count).toBe(2);
      expect(result.evidences).toHaveLength(2);
    });

    it('should throw NotFoundException when assessment not found', async () => {
      mockPrismaService.assessment.findUnique.mockResolvedValue(null);

      await expect(service.listEvidence('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate upload URL for valid assessment', async () => {
      const mockAssessment = {
        id: 'assess-1',
        status: 'IN_PROGRESS',
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      const dto = {
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        itemCode: 'DATA_01',
      };

      const result = await service.generateUploadUrl('assess-1', dto);

      expect(result.uploadUrl).toBeDefined();
      expect(result.fileKey).toContain('assess-1');
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw BadRequestException for finalized assessment', async () => {
      const mockAssessment = {
        id: 'assess-1',
        status: 'FINALIZED',
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);

      await expect(
        service.generateUploadUrl('assess-1', {
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmEvidence', () => {
    it('should create evidence record', async () => {
      const mockAssessment = { id: 'assess-1', sessionId: 'guest-123' };
      const mockEvidence = {
        id: 'evidence-1',
        assessmentId: 'assess-1',
        fileName: 'document.pdf',
      };

      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.evidence.create.mockResolvedValue(mockEvidence);

      const dto = {
        fileKey: 'assessments/assess-1/file.pdf',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      };

      const result = await service.confirmEvidence('assess-1', dto);

      expect(result.id).toBe('evidence-1');
      expect(mockPrismaService.evidence.create).toHaveBeenCalled();
    });
  });

  describe('deleteEvidence', () => {
    it('should delete evidence', async () => {
      const mockEvidence = {
        id: 'evidence-1',
        assessmentId: 'assess-1',
        storageUrl: 'path/to/file',
      };

      mockPrismaService.evidence.findUnique.mockResolvedValue(mockEvidence);
      mockPrismaService.evidence.delete.mockResolvedValue(mockEvidence);

      const result = await service.deleteEvidence('assess-1', 'evidence-1');

      expect(result.success).toBe(true);
      expect(mockPrismaService.evidence.delete).toHaveBeenCalledWith({
        where: { id: 'evidence-1' },
      });
    });

    it('should throw NotFoundException when evidence not found', async () => {
      mockPrismaService.evidence.findUnique.mockResolvedValue(null);

      await expect(service.deleteEvidence('assess-1', 'invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException when assessmentId mismatch', async () => {
      const mockEvidence = {
        id: 'evidence-1',
        assessmentId: 'assess-2', // Different assessment
      };

      mockPrismaService.evidence.findUnique.mockResolvedValue(mockEvidence);

      await expect(service.deleteEvidence('assess-1', 'evidence-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('downloadEvidence', () => {
    it('should generate download URL', async () => {
      const mockEvidence = {
        id: 'evidence-1',
        assessmentId: 'assess-1',
        storageUrl: 'path/to/file',
        fileName: 'document.pdf',
        fileSize: 1024,
      };

      mockPrismaService.evidence.findUnique.mockResolvedValue(mockEvidence);

      const result = await service.downloadEvidence('assess-1', 'evidence-1');

      expect(result.downloadUrl).toBeDefined();
      expect(result.fileName).toBe('document.pdf');
      expect(result.expiresIn).toBe(3600);
    });
  });

  describe('exportPdf', () => {
    it('should throw BadRequestException (not yet implemented)', async () => {
      await expect(service.exportPdf('assess-1')).rejects.toThrow(BadRequestException);
      await expect(service.exportPdf('assess-1')).rejects.toThrow('PDF export not yet implemented');
    });
  });

  describe('exportCsv', () => {
    it('should throw BadRequestException (not yet implemented)', async () => {
      await expect(service.exportCsv('assess-1')).rejects.toThrow(BadRequestException);
      await expect(service.exportCsv('assess-1')).rejects.toThrow('CSV export not yet implemented');
    });
  });

  describe('sendResults', () => {
    it('should return success message', async () => {
      const result = await service.sendResults('assess-1', {
        email: 'test@example.com',
        message: 'Here are your results',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Results sent successfully');
    });
  });

  describe('compareAssessments', () => {
    it('should return suggestions when organizationId provided', async () => {
      const result = await service.compareAssessments({
        organizationId: 'org-1',
      });

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should throw BadRequestException when both IDs missing', async () => {
      await expect(service.compareAssessments({})).rejects.toThrow(BadRequestException);
      await expect(service.compareAssessments({})).rejects.toThrow(
        'Both from and to assessment IDs are required'
      );
    });

    it('should throw BadRequestException when comparing same assessment', async () => {
      await expect(
        service.compareAssessments({ from: 'assess-1', to: 'assess-1' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.compareAssessments({ from: 'assess-1', to: 'assess-1' })
      ).rejects.toThrow('Cannot compare an assessment with itself');
    });

    it('should throw BadRequestException (not yet implemented)', async () => {
      await expect(
        service.compareAssessments({ from: 'assess-1', to: 'assess-2' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('compareToBenchmarks', () => {
    it('should throw BadRequestException (not yet implemented)', async () => {
      await expect(service.compareToBenchmarks('assess-1')).rejects.toThrow(BadRequestException);
      await expect(service.compareToBenchmarks('assess-1')).rejects.toThrow(
        'Benchmark comparison not yet implemented'
      );
    });
  });
});
