/**
 * Benchmark Comparison Component
 * Displays assessment comparison against industry benchmarks
 *
 * Phase 5A: Benchmark Comparison
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PercentileRankBadge } from './percentile-rank-badge';
import { DomainBenchmarkChart } from './domain-benchmark-chart';
import { TrendChart } from './trend-chart';
import { TrendingUp, TrendingDown, Users, Target, Award } from 'lucide-react';

interface BenchmarkComparisonProps {
  assessmentId: string;
}

interface BenchmarkComparisonData {
  assessmentId: string;
  organizationName: string;
  industry: string;
  size: string;
  region?: string;
  overallScore: number;
  industryOverallAverage: number;
  overallPercentileRank: number;
  overallRanking: string;
  domainComparisons: Array<{
    domainCode: string;
    domainName: string;
    userScore: number;
    industryAverage: number;
    industryMedian: number;
    industryP25: number;
    industryP75: number;
    industryP90: number;
    percentileRank: number;
    gap: number;
    ranking: string;
    maturityLevel: string;
  }>;
  topStrengths: Array<{
    itemCode: string;
    itemName: string;
    userScore: number;
    industryAverage: number;
    gap: number;
    percentileRank: number;
  }>;
  topWeaknesses: Array<{
    itemCode: string;
    itemName: string;
    userScore: number;
    industryAverage: number;
    gap: number;
    percentileRank: number;
  }>;
  peerInsights: {
    totalPeers: number;
    betterThanPercent: number;
    maturityLevel: string;
    industryMaturityBreakdown: Record<string, number>;
  };
  trends?: Array<{
    domainCode: string;
    historicalAverages: Array<{ date: string; average: number }>;
  }>;
}

export function BenchmarkComparison({ assessmentId }: BenchmarkComparisonProps) {
  const [data, setData] = useState<BenchmarkComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBenchmarkData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/assessments/${assessmentId}/benchmark`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch benchmark data');
        }

        const benchmarkData = await response.json();
        setData(benchmarkData);
      } catch (err) {
        console.error('Error fetching benchmark data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load benchmark data');
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmarkData();
  }, [assessmentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || 'Benchmark data not available for this assessment.'}
          <br />
          <span className="text-sm text-muted-foreground">
            Benchmark data may not be available if there are insufficient assessments in your
            industry/size segment.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  const gapPercentage = ((data.overallScore - data.industryOverallAverage) / data.industryOverallAverage) * 100;

  return (
    <div className="space-y-6">
      {/* Overall Comparison */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Industry Benchmark Comparison
              </CardTitle>
              <CardDescription>
                How you compare to {data.peerInsights.totalPeers} peers in {data.industry} ({data.size})
              </CardDescription>
            </div>
            <PercentileRankBadge
              percentile={data.overallPercentileRank}
              ranking={data.overallRanking}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Your Score */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Your Score</div>
              <div className="text-4xl font-bold text-blue-600">{data.overallScore.toFixed(2)}</div>
              <div className="text-xs text-blue-700 mt-1">{data.peerInsights.maturityLevel}</div>
            </div>

            {/* Industry Average */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-1">Industry Average</div>
              <div className="text-4xl font-bold text-gray-600">
                {data.industryOverallAverage.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {data.peerInsights.totalPeers} organizations
              </div>
            </div>

            {/* Gap */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-900 mb-1">Your Gap</div>
              <div className="flex items-center justify-center gap-2">
                {gapPercentage > 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
                <div className={`text-4xl font-bold ${gapPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {gapPercentage > 0 ? '+' : ''}
                  {gapPercentage.toFixed(1)}%
                </div>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {gapPercentage > 0 ? 'Above' : 'Below'} average
              </div>
            </div>
          </div>

          {/* Peer Insight */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-purple-900 mb-1">Peer Comparison</div>
                <div className="text-sm text-purple-800">
                  Your assessment ranks in the <strong>{data.overallRanking}</strong> of all{' '}
                  {data.industry} organizations with {data.size} company size. You scored better than{' '}
                  <strong>{data.peerInsights.betterThanPercent}%</strong> of your peers.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Comparisons */}
      <Card>
        <CardHeader>
          <CardTitle>Domain-Level Comparison</CardTitle>
          <CardDescription>
            Detailed breakdown of your performance across all assessment domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DomainBenchmarkChart domainComparisons={data.domainComparisons} />
        </CardContent>
      </Card>

      {/* Top Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Award className="h-5 w-5" />
              Top 5 Strengths
            </CardTitle>
            <CardDescription>Areas where you excel compared to industry peers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topStrengths.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No significant strengths identified
                </div>
              ) : (
                data.topStrengths.map((item) => (
                  <div key={item.itemCode} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-green-900">
                          {item.itemCode}: {item.itemName}
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          Your score: <strong>{item.userScore}</strong> | Industry avg:{' '}
                          {item.industryAverage.toFixed(2)}
                        </div>
                      </div>
                      <Badge className="bg-green-600 text-white shrink-0">
                        +{item.gap.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <TrendingDown className="h-5 w-5" />
              Top 5 Improvement Areas
            </CardTitle>
            <CardDescription>Areas with the most room for growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topWeaknesses.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No significant weaknesses identified
                </div>
              ) : (
                data.topWeaknesses.map((item) => (
                  <div key={item.itemCode} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-red-900">
                          {item.itemCode}: {item.itemName}
                        </div>
                        <div className="text-xs text-red-700 mt-1">
                          Your score: <strong>{item.userScore}</strong> | Industry avg:{' '}
                          {item.industryAverage.toFixed(2)}
                        </div>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {item.gap.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trends (if available) */}
      {data.trends && data.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Industry Trends</CardTitle>
            <CardDescription>
              How industry averages have changed over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart trends={data.trends} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
