import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsController', () => {
  let controller: AssessmentsController;
  let service: AssessmentsService;

  const mockAssessmentsService = {
    startAssessment: jest.fn(),
    getAssessment: jest.fn(),
    saveResponses: jest.fn(),
    finalizeAssessment: jest.fn(),
    getResults: jest.fn(),
    listEvidence: jest.fn(),
    generateUploadUrl: jest.fn(),
    confirmEvidence: jest.fn(),
    deleteEvidence: jest.fn(),
    downloadEvidence: jest.fn(),
    exportPdf: jest.fn(),
    exportCsv: jest.fn(),
    sendResults: jest.fn(),
    compareAssessments: jest.fn(),
    compareToBenchmarks: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    role: 'USER',
  };

  const mockRequest = {
    cookies: {
      assessment_session: 'guest-session-123',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentsController],
      providers: [
        {
          provide: AssessmentsService,
          useValue: mockAssessmentsService,
        },
      ],
    }).compile();

    controller = module.get<AssessmentsController>(AssessmentsController);
    service = module.get<AssessmentsService>(AssessmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('startAssessment', () => {
    it('should create assessment for authenticated user', async () => {
      const dto = { industry: 'Tech', size: 'Medium', region: 'Asia' };
      const mockResult = {
        assessmentId: 'assess-1',
        templateVersion: 'v1.0',
      };

      mockAssessmentsService.startAssessment.mockResolvedValue(mockResult);

      const result = await controller.startAssessment(dto, mockUser);

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.startAssessment).toHaveBeenCalledWith(dto, 'user-1');
    });

    it('should create assessment for guest user', async () => {
      const dto = {};
      const mockResult = {
        assessmentId: 'assess-1',
        sessionId: 'guest-123',
        templateVersion: 'v1.0',
      };

      mockAssessmentsService.startAssessment.mockResolvedValue(mockResult);

      const result = await controller.startAssessment(dto);

      expect(result.sessionId).toBeDefined();
      expect(mockAssessmentsService.startAssessment).toHaveBeenCalledWith(dto, undefined);
    });
  });

  describe('getAssessment', () => {
    it('should return assessment for authenticated user', async () => {
      const mockAssessment = {
        assessment: { id: 'assess-1', status: 'IN_PROGRESS' },
        template: { version: 'v1.0', domains: [] },
        responses: {},
      };

      mockAssessmentsService.getAssessment.mockResolvedValue(mockAssessment);

      const result = await controller.getAssessment('assess-1', mockUser, mockRequest);

      expect(result).toEqual(mockAssessment);
      expect(mockAssessmentsService.getAssessment).toHaveBeenCalledWith(
        'assess-1',
        'user-1',
        'guest-session-123'
      );
    });

    it('should return assessment for guest user with sessionId', async () => {
      const mockAssessment = {
        assessment: { id: 'assess-1' },
        template: { domains: [] },
        responses: {},
      };

      mockAssessmentsService.getAssessment.mockResolvedValue(mockAssessment);

      const result = await controller.getAssessment('assess-1', undefined, mockRequest);

      expect(result).toEqual(mockAssessment);
      expect(mockAssessmentsService.getAssessment).toHaveBeenCalledWith(
        'assess-1',
        undefined,
        'guest-session-123'
      );
    });
  });

  describe('saveResponses', () => {
    it('should save responses and return progress', async () => {
      const dto = {
        responses: {
          'item-1': { score: 3, currentState: 'Good' },
        },
      };
      const mockResult = {
        success: true,
        savedAt: '2025-01-08T00:00:00.000Z',
        progress: 75,
      };

      mockAssessmentsService.saveResponses.mockResolvedValue(mockResult);

      const result = await controller.saveResponses('assess-1', dto, mockUser, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.saveResponses).toHaveBeenCalledWith(
        'assess-1',
        dto,
        'user-1',
        'guest-session-123'
      );
    });
  });

  describe('finalizeAssessment', () => {
    it('should finalize assessment and return snapshot', async () => {
      const mockResult = {
        snapshotId: 'snapshot-1',
        scores: {
          itemScores: {},
          domainScores: {},
          totalScore: 3.75,
          maturityLevel: 'Quản lý',
          maturityLevelEn: 'Managed',
          completeness: 95,
        },
      };

      mockAssessmentsService.finalizeAssessment.mockResolvedValue(mockResult);

      const result = await controller.finalizeAssessment('assess-1', mockUser, mockRequest);

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.finalizeAssessment).toHaveBeenCalledWith(
        'assess-1',
        'user-1',
        'guest-session-123'
      );
    });
  });

  describe('getResults', () => {
    it('should return assessment results', async () => {
      const mockResults = {
        assessment: {
          id: 'assess-1',
          status: 'FINALIZED',
        },
        snapshot: {
          id: 'snapshot-1',
          totalScore: 3.75,
          maturityLevel: 'Quản lý',
        },
        domains: [],
        analysis: {
          strengths: [],
          weaknesses: [],
          gaps: [],
          recommendations: {},
        },
      };

      mockAssessmentsService.getResults.mockResolvedValue(mockResults);

      const result = await controller.getResults('assess-1', mockUser, mockRequest);

      expect(result).toEqual(mockResults);
      expect(mockAssessmentsService.getResults).toHaveBeenCalledWith(
        'assess-1',
        'user-1',
        'guest-session-123'
      );
    });
  });

  describe('listEvidence', () => {
    it('should return list of evidence files', async () => {
      const mockEvidence = {
        assessmentId: 'assess-1',
        count: 2,
        evidences: [
          { id: 'evidence-1', fileName: 'doc1.pdf' },
          { id: 'evidence-2', fileName: 'doc2.pdf' },
        ],
      };

      mockAssessmentsService.listEvidence.mockResolvedValue(mockEvidence);

      const result = await controller.listEvidence('assess-1');

      expect(result).toEqual(mockEvidence);
      expect(mockAssessmentsService.listEvidence).toHaveBeenCalledWith('assess-1');
    });
  });

  describe('generateUploadUrl', () => {
    it('should generate presigned upload URL', async () => {
      const dto = {
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        itemCode: 'DATA_01',
      };
      const mockResult = {
        uploadUrl: 'https://storage.example.com/upload/...',
        fileKey: 'assessments/assess-1/file.pdf',
        expiresIn: 3600,
        assessmentId: 'assess-1',
        itemCode: 'DATA_01',
      };

      mockAssessmentsService.generateUploadUrl.mockResolvedValue(mockResult);

      const result = await controller.generateUploadUrl('assess-1', dto);

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.generateUploadUrl).toHaveBeenCalledWith('assess-1', dto);
    });
  });

  describe('confirmEvidence', () => {
    it('should confirm evidence upload', async () => {
      const dto = {
        fileKey: 'path/to/file',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      };
      const mockEvidence = {
        id: 'evidence-1',
        assessmentId: 'assess-1',
        fileName: 'document.pdf',
      };

      mockAssessmentsService.confirmEvidence.mockResolvedValue(mockEvidence);

      const result = await controller.confirmEvidence('assess-1', dto, mockUser);

      expect(result).toEqual(mockEvidence);
      expect(mockAssessmentsService.confirmEvidence).toHaveBeenCalledWith(
        'assess-1',
        dto,
        'user-1'
      );
    });
  });

  describe('downloadEvidence', () => {
    it('should generate download URL', async () => {
      const mockResult = {
        downloadUrl: 'https://storage.example.com/download/...',
        fileName: 'document.pdf',
        fileSize: 1024,
        expiresIn: 3600,
      };

      mockAssessmentsService.downloadEvidence.mockResolvedValue(mockResult);

      const result = await controller.downloadEvidence('assess-1', 'evidence-1');

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.downloadEvidence).toHaveBeenCalledWith(
        'assess-1',
        'evidence-1'
      );
    });
  });

  describe('deleteEvidence', () => {
    it('should delete evidence', async () => {
      const mockResult = { success: true };

      mockAssessmentsService.deleteEvidence.mockResolvedValue(mockResult);

      const result = await controller.deleteEvidence('assess-1', 'evidence-1');

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.deleteEvidence).toHaveBeenCalledWith(
        'assess-1',
        'evidence-1'
      );
    });
  });

  describe('exportPdf', () => {
    it('should call exportPdf service method', async () => {
      mockAssessmentsService.exportPdf.mockResolvedValue({});

      await controller.exportPdf('assess-1');

      expect(mockAssessmentsService.exportPdf).toHaveBeenCalledWith('assess-1');
    });
  });

  describe('exportCsv', () => {
    it('should call exportCsv service method', async () => {
      mockAssessmentsService.exportCsv.mockResolvedValue({});

      await controller.exportCsv('assess-1');

      expect(mockAssessmentsService.exportCsv).toHaveBeenCalledWith('assess-1');
    });
  });

  describe('sendResults', () => {
    it('should send results via email', async () => {
      const dto = {
        email: 'user@example.com',
        message: 'Your assessment results',
        includePdf: true,
      };
      const mockResult = {
        success: true,
        message: 'Results sent successfully',
      };

      mockAssessmentsService.sendResults.mockResolvedValue(mockResult);

      const result = await controller.sendResults('assess-1', dto);

      expect(result).toEqual(mockResult);
      expect(mockAssessmentsService.sendResults).toHaveBeenCalledWith('assess-1', dto);
    });
  });

  describe('compareAssessments', () => {
    it('should compare two assessments', async () => {
      const dto = { from: 'assess-1', to: 'assess-2' };
      const mockComparison = {
        from: { id: 'assess-1', totalScore: 3.5 },
        to: { id: 'assess-2', totalScore: 4.0 },
        improvements: [],
      };

      mockAssessmentsService.compareAssessments.mockResolvedValue(mockComparison);

      const result = await controller.compareAssessments(dto);

      expect(result).toEqual(mockComparison);
      expect(mockAssessmentsService.compareAssessments).toHaveBeenCalledWith(dto);
    });

    it('should return suggestions when organizationId provided', async () => {
      const dto = { organizationId: 'org-1' };
      const mockSuggestions = { suggestions: [] };

      mockAssessmentsService.compareAssessments.mockResolvedValue(mockSuggestions);

      const result = await controller.compareAssessments(dto);

      expect(result).toEqual(mockSuggestions);
      expect(mockAssessmentsService.compareAssessments).toHaveBeenCalledWith(dto);
    });
  });

  describe('compareToBenchmarks', () => {
    it('should compare assessment to benchmarks', async () => {
      const mockComparison = {
        assessment: { id: 'assess-1', totalScore: 3.5 },
        benchmark: { avgScore: 3.8, p50: 3.7 },
        percentile: 45,
      };

      mockAssessmentsService.compareToBenchmarks.mockResolvedValue(mockComparison);

      const result = await controller.compareToBenchmarks('assess-1');

      expect(result).toEqual(mockComparison);
      expect(mockAssessmentsService.compareToBenchmarks).toHaveBeenCalledWith('assess-1');
    });
  });

  describe('API Documentation', () => {
    it('should have Swagger API tags', () => {
      const metadata = Reflect.getMetadata('swagger/apiUseTags', AssessmentsController);
      expect(metadata).toEqual(['assessments']);
    });
  });
});
