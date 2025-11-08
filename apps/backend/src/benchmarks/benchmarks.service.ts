import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';
import { GetBenchmarkDto, GetTrendsDto, AggregateBenchmarkDto } from './dto';

@Injectable()
export class BenchmarksService {
  private readonly logger = new Logger(BenchmarksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get benchmark data for a specific industry/size/region segment
   * Returns domain and item benchmarks with statistical measures
   */
  async getBenchmarkData(dto: GetBenchmarkDto) {
    const { industry, size, region } = dto;

    const domainBenchmarks = await this.prisma.benchmarkData.findMany({
      where: {
        industry,
        size,
        ...(region && { region }),
      },
      orderBy: {
        domainCode: 'asc',
      },
    });

    const itemBenchmarks = await this.prisma.benchmarkItemData.findMany({
      where: {
        industry,
        size,
        ...(region && { region }),
      },
      orderBy: {
        itemCode: 'asc',
      },
    });

    if (domainBenchmarks.length === 0) {
      throw new NotFoundException(
        `No benchmark data found for segment: ${industry} / ${size}${region ? ` / ${region}` : ''}`
      );
    }

    return {
      domainBenchmarks,
      itemBenchmarks,
    };
  }

  /**
   * Get historical benchmark trends for a segment
   * Returns snapshots ordered by date (oldest to newest)
   */
  async getHistoricalTrends(dto: GetTrendsDto) {
    const { industry, size, region, months = 12 } = dto;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const snapshots = await this.prisma.benchmarkSnapshot.findMany({
      where: {
        industry,
        size,
        ...(region && { region }),
        snapshotDate: {
          gte: startDate,
        },
      },
      orderBy: {
        snapshotDate: 'asc',
      },
    });

    return {
      industry,
      size,
      region,
      months,
      snapshots,
    };
  }

  /**
   * Aggregate benchmarks for all segments or a specific segment
   * Admin-only endpoint
   */
  async aggregateBenchmarks(dto: AggregateBenchmarkDto) {
    const { industry, size, region, createSnapshots = false, aggregateAll = false } = dto;

    const startTime = Date.now();

    if (aggregateAll) {
      // Get all unique segment combinations from finalized assessments
      const segments = await this.prisma.assessment.groupBy({
        by: ['industry', 'size', 'region'],
        where: {
          status: 'FINALIZED',
          industry: { not: null },
          size: { not: null },
        },
      });

      this.logger.log(`Aggregating benchmarks for ${segments.length} segments`);

      let processedCount = 0;
      for (const segment of segments) {
        if (!segment.industry || !segment.size) continue;

        this.logger.log(
          `Processing segment: ${segment.industry} / ${segment.size} / ${segment.region || 'all'}`
        );

        await this.aggregateSegment(
          segment.industry,
          segment.size,
          segment.region || undefined,
          createSnapshots
        );
        processedCount++;
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Benchmark aggregation complete in ${duration}ms`);

      return {
        success: true,
        message: 'All benchmarks aggregated successfully',
        segmentsProcessed: processedCount,
        duration,
      };
    } else if (industry && size) {
      // Aggregate specific segment
      const result = await this.aggregateSegment(industry, size, region, createSnapshots);

      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Segment benchmarks aggregated successfully',
        industry,
        size,
        region,
        domainCount: result.domainCount,
        itemCount: result.itemCount,
        sampleSize: result.sampleSize,
        duration,
      };
    } else {
      throw new BadRequestException(
        'Either aggregateAll must be true, or industry and size must be provided'
      );
    }
  }

  /**
   * Aggregate benchmarks for a specific segment
   * Private helper method
   */
  private async aggregateSegment(
    industry: string,
    size: string,
    region?: string,
    createSnapshot: boolean = false
  ) {
    // Get all finalized assessments for this segment
    const assessments = await this.prisma.assessment.findMany({
      where: {
        industry,
        size,
        ...(region && { region }),
        status: 'FINALIZED',
      },
      include: {
        responses: true,
      },
    });

    if (assessments.length === 0) {
      throw new NotFoundException(
        `No finalized assessments found for segment: ${industry} / ${size}${region ? ` / ${region}` : ''}`
      );
    }

    this.logger.log(
      `Aggregating ${assessments.length} assessments for ${industry} / ${size}${region ? ` / ${region}` : ''}`
    );

    // Group responses by domain and calculate statistics
    const domainScores = new Map<string, number[]>();
    const itemScores = new Map<string, number[]>();

    for (const assessment of assessments) {
      for (const response of assessment.responses) {
        // Collect item scores
        if (!itemScores.has(response.itemCode)) {
          itemScores.set(response.itemCode, []);
        }
        itemScores.get(response.itemCode)!.push(response.score);

        // Note: Domain aggregation would require calculating domain scores
        // This is simplified - full implementation would aggregate by domain
      }
    }

    // Calculate statistics for each item
    const itemBenchmarks: any[] = [];
    for (const [itemCode, scores] of itemScores.entries()) {
      const stats = this.calculateStatistics(scores);
      itemBenchmarks.push({
        industry,
        size,
        ...(region && { region }),
        itemCode,
        ...stats,
      });
    }

    // Update benchmark item data
    for (const benchmark of itemBenchmarks) {
      await this.prisma.benchmarkItemData.upsert({
        where: {
          industry_size_itemCode: {
            industry: benchmark.industry,
            size: benchmark.size,
            itemCode: benchmark.itemCode,
          },
        },
        update: benchmark,
        create: benchmark,
      });
    }

    // TODO: Implement domain benchmark aggregation
    // TODO: Implement snapshot creation if requested

    return {
      domainCount: 0, // Simplified for now
      itemCount: itemBenchmarks.length,
      sampleSize: assessments.length,
    };
  }

  /**
   * Calculate statistical measures from array of scores
   * Private helper method
   */
  private calculateStatistics(scores: number[]) {
    if (scores.length === 0) {
      return {
        avgScore: 0,
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0,
        minScore: 0,
        maxScore: 0,
        stdDev: 0,
        sampleSize: 0,
      };
    }

    // Sort scores for percentile calculations
    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate average
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avgScore = sum / n;

    // Calculate standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avgScore, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles using linear interpolation
    const percentile = (p: number): number => {
      const index = (p / 100) * (n - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;

      if (lower === upper) {
        return sorted[lower];
      }

      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    return {
      avgScore: Math.round(avgScore * 100) / 100,
      p25: Math.round(percentile(25) * 100) / 100,
      p50: Math.round(percentile(50) * 100) / 100,
      p75: Math.round(percentile(75) * 100) / 100,
      p90: Math.round(percentile(90) * 100) / 100,
      minScore: sorted[0],
      maxScore: sorted[n - 1],
      stdDev: Math.round(stdDev * 100) / 100,
      sampleSize: n,
    };
  }
}
