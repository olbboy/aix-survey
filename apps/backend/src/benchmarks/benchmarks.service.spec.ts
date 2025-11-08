import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BenchmarksService } from './benchmarks.service';
import { PrismaService } from '@aix-survey/database';
import { GetBenchmarkDto, GetTrendsDto, AggregateBenchmarkDto } from './dto';

describe('BenchmarksService', () => {
  let service: BenchmarksService;
  let prisma: PrismaService;

  const mockPrismaService = {
    benchmarkData: {
      findMany: jest.fn(),
    },
    benchmarkItemData: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    benchmarkSnapshot: {
      findMany: jest.fn(),
    },
    assessment: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockBenchmarkData = [
    {
      domainCode: 'TECH',
      industry: 'Technology',
      size: 'Small (1-50)',
      region: 'North America',
      avgScore: 75.5,
      p25: 60,
      p50: 75,
      p75: 88,
      p90: 95,
      sampleSize: 150,
    },
  ];

  const mockItemBenchmarks = [
    {
      itemCode: 'ITEM001',
      industry: 'Technology',
      size: 'Small (1-50)',
      avgScore: 80,
      p25: 70,
      p50: 80,
      p75: 90,
      p90: 95,
      sampleSize: 150,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BenchmarksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BenchmarksService>(BenchmarksService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBenchmarkData', () => {
    const dto: GetBenchmarkDto = {
      industry: 'Technology',
      size: 'Small (1-50)',
      region: 'North America',
    };

    it('should return benchmark data for valid segment', async () => {
      mockPrismaService.benchmarkData.findMany.mockResolvedValue(mockBenchmarkData);
      mockPrismaService.benchmarkItemData.findMany.mockResolvedValue(mockItemBenchmarks);

      const result = await service.getBenchmarkData(dto);

      expect(result).toEqual({
        domainBenchmarks: mockBenchmarkData,
        itemBenchmarks: mockItemBenchmarks,
      });
      expect(mockPrismaService.benchmarkData.findMany).toHaveBeenCalledWith({
        where: {
          industry: dto.industry,
          size: dto.size,
          region: dto.region,
        },
        orderBy: {
          domainCode: 'asc',
        },
      });
    });

    it('should handle optional region parameter', async () => {
      const dtoWithoutRegion = { industry: 'Technology', size: 'Small (1-50)' };
      mockPrismaService.benchmarkData.findMany.mockResolvedValue(mockBenchmarkData);
      mockPrismaService.benchmarkItemData.findMany.mockResolvedValue([]);

      await service.getBenchmarkData(dtoWithoutRegion);

      expect(mockPrismaService.benchmarkData.findMany).toHaveBeenCalledWith({
        where: {
          industry: dtoWithoutRegion.industry,
          size: dtoWithoutRegion.size,
        },
        orderBy: {
          domainCode: 'asc',
        },
      });
    });

    it('should throw NotFoundException when no data found', async () => {
      mockPrismaService.benchmarkData.findMany.mockResolvedValue([]);
      mockPrismaService.benchmarkItemData.findMany.mockResolvedValue([]);

      await expect(service.getBenchmarkData(dto)).rejects.toThrow(NotFoundException);
      await expect(service.getBenchmarkData(dto)).rejects.toThrow(
        'No benchmark data found for segment'
      );
    });
  });

  describe('getHistoricalTrends', () => {
    const dto: GetTrendsDto = {
      industry: 'Technology',
      size: 'Small (1-50)',
      region: 'North America',
      months: 12,
    };

    const mockSnapshots = [
      {
        snapshotDate: new Date('2024-01-01'),
        industry: 'Technology',
        size: 'Small (1-50)',
        avgScore: 70,
      },
    ];

    it('should return historical trends', async () => {
      mockPrismaService.benchmarkSnapshot.findMany.mockResolvedValue(mockSnapshots);

      const result = await service.getHistoricalTrends(dto);

      expect(result).toEqual({
        industry: dto.industry,
        size: dto.size,
        region: dto.region,
        months: dto.months,
        snapshots: mockSnapshots,
      });
    });

    it('should calculate correct date range for months parameter', async () => {
      mockPrismaService.benchmarkSnapshot.findMany.mockResolvedValue([]);

      await service.getHistoricalTrends(dto);

      const call = mockPrismaService.benchmarkSnapshot.findMany.mock.calls[0][0];
      expect(call.where.snapshotDate.gte).toBeInstanceOf(Date);
    });

    it('should default to 12 months if not specified', async () => {
      const dtoWithoutMonths = { industry: 'Technology', size: 'Small (1-50)' };
      mockPrismaService.benchmarkSnapshot.findMany.mockResolvedValue([]);

      const result = await service.getHistoricalTrends(dtoWithoutMonths);

      expect(result.months).toBe(12);
    });
  });

  describe('aggregateBenchmarks', () => {
    it('should aggregate all segments when aggregateAll is true', async () => {
      const dto: AggregateBenchmarkDto = { aggregateAll: true };
      const mockSegments = [
        { industry: 'Tech', size: 'Small (1-50)', region: 'NA' },
        { industry: 'Finance', size: 'Medium (51-200)', region: null },
      ];

      mockPrismaService.assessment.groupBy.mockResolvedValue(mockSegments);
      mockPrismaService.assessment.findMany.mockResolvedValue([
        {
          id: '1',
          responses: [{ itemCode: 'ITEM001', score: 80 }],
        },
      ]);
      mockPrismaService.benchmarkItemData.upsert.mockResolvedValue({});

      const result = await service.aggregateBenchmarks(dto);

      expect(result.success).toBe(true);
      expect(result.segmentsProcessed).toBe(2);
      expect(result).toHaveProperty('duration');
    });

    it('should aggregate specific segment when industry and size provided', async () => {
      const dto: AggregateBenchmarkDto = {
        industry: 'Technology',
        size: 'Small (1-50)',
        createSnapshots: false,
      };

      mockPrismaService.assessment.findMany.mockResolvedValue([
        {
          id: '1',
          responses: [{ itemCode: 'ITEM001', score: 80 }],
        },
      ]);
      mockPrismaService.benchmarkItemData.upsert.mockResolvedValue({});

      const result = await service.aggregateBenchmarks(dto);

      expect(result.success).toBe(true);
      expect(result.industry).toBe(dto.industry);
      expect(result.size).toBe(dto.size);
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('itemCount');
    });

    it('should throw BadRequestException when neither aggregateAll nor industry/size provided', async () => {
      const dto: AggregateBenchmarkDto = {};

      await expect(service.aggregateBenchmarks(dto)).rejects.toThrow(BadRequestException);
      await expect(service.aggregateBenchmarks(dto)).rejects.toThrow(
        'Either aggregateAll must be true, or industry and size must be provided'
      );
    });

    it('should throw NotFoundException when no assessments found for segment', async () => {
      const dto: AggregateBenchmarkDto = {
        industry: 'Technology',
        size: 'Small (1-50)',
      };

      mockPrismaService.assessment.findMany.mockResolvedValue([]);

      await expect(service.aggregateBenchmarks(dto)).rejects.toThrow(NotFoundException);
    });
  });
});
