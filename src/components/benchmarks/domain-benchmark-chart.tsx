/**
 * Domain Benchmark Chart Component
 * Visual comparison of domain scores against industry benchmarks
 */

'use client';

import { Progress } from '@/components/ui/progress';
import { PercentileRankBadge } from './percentile-rank-badge';

interface DomainComparison {
  domainCode: string;
  domainName: string;
  userScore: number;
  industryAverage: number | null;
  industryMedian: number | null;
  industryP25: number | null;
  industryP75: number | null;
  industryP90: number | null;
  percentileRank: number;
  gap: number | null;
  ranking: string;
  maturityLevel: string;
}

interface DomainBenchmarkChartProps {
  domainComparisons: DomainComparison[];
}

export function DomainBenchmarkChart({ domainComparisons }: DomainBenchmarkChartProps) {
  return (
    <div className="space-y-6">
      {domainComparisons.map((domain) => {
        const maxScore = 5;
        const userPercentage = (domain.userScore / maxScore) * 100;
        const avgPercentage = domain.industryAverage !== null ? (domain.industryAverage / maxScore) * 100 : 0;
        const p25Percentage = domain.industryP25 !== null ? (domain.industryP25 / maxScore) * 100 : 0;
        const p75Percentage = domain.industryP75 !== null ? (domain.industryP75 / maxScore) * 100 : 0;
        const p90Percentage = domain.industryP90 !== null ? (domain.industryP90 / maxScore) * 100 : 0;
        const medianPercentage = domain.industryMedian !== null ? (domain.industryMedian / maxScore) * 100 : 0;

        return (
          <div key={domain.domainCode} className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-base">{domain.domainName}</div>
                <div className="text-sm text-muted-foreground">
                  {domain.domainCode.toUpperCase()} | {domain.maturityLevel}
                </div>
              </div>
              <PercentileRankBadge
                percentile={domain.percentileRank}
                ranking={domain.ranking}
                size="sm"
              />
            </div>

            {/* Scores */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-xs text-blue-700 font-medium">Your Score</div>
                <div className="text-lg font-bold text-blue-900">{domain.userScore.toFixed(2)}</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-700 font-medium">Industry Avg</div>
                <div className="text-lg font-bold text-gray-900">
                  {domain.industryAverage !== null ? domain.industryAverage.toFixed(2) : 'N/A'}
                </div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-xs text-green-700 font-medium">Gap</div>
                <div
                  className={`text-lg font-bold ${
                    domain.gap !== null && domain.gap > 0 ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {domain.gap !== null ? (
                    <>
                      {domain.gap > 0 ? '+' : ''}
                      {domain.gap.toFixed(2)}
                    </>
                  ) : (
                    'N/A'
                  )}
                </div>
              </div>
            </div>

            {/* Visual Chart */}
            <div className="relative h-20 bg-gray-100 rounded-lg p-4">
              {/* Background percentile ranges */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-8 flex">
                {/* 0-25th percentile - Red */}
                <div
                  className="bg-red-200 h-full"
                  style={{ width: `${p25Percentage}%` }}
                />
                {/* 25-75th percentile - Yellow */}
                <div
                  className="bg-yellow-200 h-full"
                  style={{ width: `${p75Percentage - p25Percentage}%` }}
                />
                {/* 75-90th percentile - Green */}
                <div
                  className="bg-green-200 h-full"
                  style={{ width: `${p90Percentage - p75Percentage}%` }}
                />
                {/* 90-100th percentile - Blue */}
                <div
                  className="bg-blue-200 h-full"
                  style={{ width: `${100 - p90Percentage}%` }}
                />
              </div>

              {/* Markers */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-8">
                {/* P25 marker */}
                {domain.industryP25 !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                    style={{ left: `${p25Percentage}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-red-700 font-medium whitespace-nowrap">
                      P25
                    </div>
                  </div>
                )}

                {/* Median marker */}
                {domain.industryMedian !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-600"
                    style={{ left: `${medianPercentage}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-yellow-700 font-medium whitespace-nowrap">
                      Median
                    </div>
                  </div>
                )}

                {/* P75 marker */}
                {domain.industryP75 !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-green-600"
                    style={{ left: `${p75Percentage}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-green-700 font-medium whitespace-nowrap">
                      P75
                    </div>
                  </div>
                )}

                {/* P90 marker */}
                {domain.industryP90 !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-600"
                    style={{ left: `${p90Percentage}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-blue-700 font-medium whitespace-nowrap">
                      P90
                    </div>
                  </div>
                )}

                {/* User score marker */}
                <div
                  className="absolute -top-2 -bottom-2 w-1 bg-purple-600 rounded-full shadow-lg"
                  style={{ left: `${userPercentage}%` }}
                >
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-bold text-purple-700 whitespace-nowrap">
                    You
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>Score: 0</span>
              <span className="font-medium text-purple-700">
                Your position: {domain.userScore.toFixed(2)} ({domain.percentileRank}th percentile)
              </span>
              <span>Score: 5</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
