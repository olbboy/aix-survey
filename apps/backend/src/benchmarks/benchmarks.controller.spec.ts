import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BenchmarksController } from './benchmarks.controller';
import { BenchmarksService } from './benchmarks.service';
import { GetBenchmarkDto, GetTrendsDto, AggregateBenchmarkDto } from './dto';

describe('BenchmarksController', () => {
  let controller: BenchmarksController;
  let service: BenchmarksService;

  const mockBenchmarksService = {
    getBenchmarkData: jest.fn(),
    getHistoricalTrends: jest.fn(),
    aggregateBenchmarks: jest.fn(),
  };

  const mockBenchmarkData = {
    domainBenchmarks: [
      {
        domainCode: 'TECH',
        avgScore: 75.5,
        p25: 60,
        p50: 75,
        p75: 88,
        p90: 95,
        sampleSize: 150,
      },
    ],
    itemBenchmarks: [],
  };

  const mockTrendsData = {
    industry: 'Technology',
    size: 'Small (1-50)',
    region: 'North America',
    months: 12,
    snapshots: [{ snapshotDate: '2024-01-01', avgScore: 70 }],
  };

  const mockAggregationResult = {
    success: true,
    message: 'All benchmarks aggregated successfully',
    segmentsProcessed: 15,
    duration: 5432,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BenchmarksController],
      providers: [
        {
          provide: BenchmarksService,
          useValue: mockBenchmarksService,
        },
      ],
    }).compile();

    controller = module.get<BenchmarksController>(BenchmarksController);
    service = module.get<BenchmarksService>(BenchmarksService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBenchmarkData', () => {
    const query: GetBenchmarkDto = {
      industry: 'Technology',
      size: 'Small (1-50)',
      region: 'North America',
    };

    it('should return benchmark data', async () => {
      mockBenchmarksService.getBenchmarkData.mockResolvedValue(mockBenchmarkData);

      const result = await controller.getBenchmarkData(query);

      expect(result).toEqual(mockBenchmarkData);
      expect(mockBenchmarksService.getBenchmarkData).toHaveBeenCalledWith(query);
    });

    it('should handle missing region parameter', async () => {
      const queryWithoutRegion = { industry: 'Technology', size: 'Small (1-50)' };
      mockBenchmarksService.getBenchmarkData.mockResolvedValue(mockBenchmarkData);

      await controller.getBenchmarkData(queryWithoutRegion as GetBenchmarkDto);

      expect(mockBenchmarksService.getBenchmarkData).toHaveBeenCalledWith(queryWithoutRegion);
    });

    it('should throw NotFoundException when no data found', async () => {
      mockBenchmarksService.getBenchmarkData.mockRejectedValue(
        new NotFoundException('No benchmark data found')
      );

      await expect(controller.getBenchmarkData(query)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getHistoricalTrends', () => {
    const query: GetTrendsDto = {
      industry: 'Technology',
      size: 'Small (1-50)',
      region: 'North America',
      months: 12,
    };

    it('should return historical trends', async () => {
      mockBenchmarksService.getHistoricalTrends.mockResolvedValue(mockTrendsData);

      const result = await controller.getHistoricalTrends(query);

      expect(result).toEqual(mockTrendsData);
      expect(mockBenchmarksService.getHistoricalTrends).toHaveBeenCalledWith(query);
    });

    it('should handle custom months parameter', async () => {
      const queryWith24Months = { ...query, months: 24 };
      mockBenchmarksService.getHistoricalTrends.mockResolvedValue({
        ...mockTrendsData,
        months: 24,
      });

      const result = await controller.getHistoricalTrends(queryWith24Months);

      expect(result.months).toBe(24);
    });

    it('should default to 12 months when not specified', async () => {
      const queryWithoutMonths = { industry: 'Technology', size: 'Small (1-50)' };
      mockBenchmarksService.getHistoricalTrends.mockResolvedValue(mockTrendsData);

      await controller.getHistoricalTrends(queryWithoutMonths as GetTrendsDto);

      expect(mockBenchmarksService.getHistoricalTrends).toHaveBeenCalled();
    });
  });

  describe('aggregateBenchmarks', () => {
    it('should aggregate all benchmarks when aggregateAll is true', async () => {
      const dto: AggregateBenchmarkDto = { aggregateAll: true };
      mockBenchmarksService.aggregateBenchmarks.mockResolvedValue(mockAggregationResult);

      const result = await controller.aggregateBenchmarks(dto);

      expect(result).toEqual(mockAggregationResult);
      expect(mockBenchmarksService.aggregateBenchmarks).toHaveBeenCalledWith(dto);
    });

    it('should aggregate specific segment', async () => {
      const dto: AggregateBenchmarkDto = {
        industry: 'Technology',
        size: 'Small (1-50)',
        createSnapshots: false,
      };
      const segmentResult = {
        success: true,
        message: 'Segment benchmarks aggregated successfully',
        industry: 'Technology',
        size: 'Small (1-50)',
        domainCount: 5,
        itemCount: 25,
        sampleSize: 50,
        duration: 1234,
      };
      mockBenchmarksService.aggregateBenchmarks.mockResolvedValue(segmentResult);

      const result = await controller.aggregateBenchmarks(dto);

      expect(result).toEqual(segmentResult);
      expect(result.industry).toBe(dto.industry);
      expect(result.size).toBe(dto.size);
    });

    it('should handle createSnapshots flag', async () => {
      const dto: AggregateBenchmarkDto = {
        industry: 'Technology',
        size: 'Small (1-50)',
        createSnapshots: true,
      };
      mockBenchmarksService.aggregateBenchmarks.mockResolvedValue({
        ...mockAggregationResult,
        message: 'Segment benchmarks aggregated with snapshots',
      });

      await controller.aggregateBenchmarks(dto);

      expect(mockBenchmarksService.aggregateBenchmarks).toHaveBeenCalledWith(dto);
      const call = mockBenchmarksService.aggregateBenchmarks.mock.calls[0][0];
      expect(call.createSnapshots).toBe(true);
    });

    it('should throw BadRequestException for invalid parameters', async () => {
      const dto: AggregateBenchmarkDto = {};
      mockBenchmarksService.aggregateBenchmarks.mockRejectedValue(
        new BadRequestException('Invalid parameters')
      );

      await expect(controller.aggregateBenchmarks(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when no assessments found', async () => {
      const dto: AggregateBenchmarkDto = {
        industry: 'Technology',
        size: 'Small (1-50)',
      };
      mockBenchmarksService.aggregateBenchmarks.mockRejectedValue(
        new NotFoundException('No finalized assessments found')
      );

      await expect(controller.aggregateBenchmarks(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Public Endpoints', () => {
    it('should have @Public() decorator on GET endpoints', () => {
      const metadata = Reflect.getMetadata('isPublic', controller.getBenchmarkData);
      expect(metadata).toBe(true);
    });

    it('should have @Public() decorator on trends endpoint', () => {
      const metadata = Reflect.getMetadata('isPublic', controller.getHistoricalTrends);
      expect(metadata).toBe(true);
    });
  });

  describe('Admin-Only Endpoint', () => {
    it('should have @Roles decorator on aggregate endpoint', () => {
      const metadata = Reflect.getMetadata('roles', controller.aggregateBenchmarks);
      expect(metadata).toContain('ADMIN');
    });
  });

  describe('API Documentation', () => {
    it('should have Swagger API tags', () => {
      const metadata = Reflect.getMetadata('swagger/apiUseTags', BenchmarksController);
      expect(metadata).toBeDefined();
    });
  });
});
