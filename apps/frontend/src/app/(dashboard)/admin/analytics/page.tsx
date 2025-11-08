/**
 * Admin Analytics Dashboard
 * Comprehensive platform analytics and trends
 *
 * Phase 5C: Admin Dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  FileText,
  Target,
  BarChart3,
  PieChart,
  Globe,
  Building,
} from 'lucide-react';

interface AnalyticsData {
  statistics: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    userGrowthRate: number;
    totalOrganizations: number;
    activeOrganizations: number;
    totalAssessments: number;
    finalizedAssessments: number;
    draftAssessments: number;
    averageCompletionTime: number;
    completionRate: number;
    averageAssessmentsPerOrg: number;
    averageScoreImprovement: number;
    totalGoalsCreated: number;
    goalAchievementRate: number;
    totalResponses: number;
    totalEvidence: number;
    totalStorageUsed: number;
  };
  usage: {
    monthlyGrowth: Array<{
      month: string;
      users: number;
      orgs: number;
      assessments: number;
    }>;
    featureUsage: {
      pdfExports: number;
      csvExports: number;
      emailsSent: number;
      benchmarkComparisons: number;
      evidenceUploads: number;
    };
    topIndustries: Array<{
      industry: string;
      count: number;
      avgScore: number;
    }>;
    topRegions: Array<{
      region: string;
      count: number;
    }>;
    companySizeDistribution: Array<{
      size: string;
      count: number;
      percentage: number;
    }>;
  };
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/admin/analytics?days=${timeframe}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-gray-500 mt-1">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-red-500 mt-1">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  const { statistics, usage } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive usage metrics and trends</p>
        </div>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* User Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          User Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalUsers.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="text-xs">
                  {statistics.activeUsers} active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">New This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.newUsersThisMonth}</div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                {statistics.userGrowthRate >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={statistics.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {statistics.userGrowthRate >= 0 ? '+' : ''}
                  {statistics.userGrowthRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalOrganizations}</div>
              <div className="text-sm text-gray-500 mt-2">
                {statistics.activeOrganizations} active
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Avg. Assessments/Org</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statistics.averageAssessmentsPerOrg.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 mt-2">Per organization</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assessment Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          Assessment Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalAssessments}</div>
              <div className="text-sm text-gray-500 mt-2">All time</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Finalized</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.finalizedAssessments}</div>
              <Badge className="mt-2 bg-green-100 text-green-700">
                {statistics.completionRate.toFixed(1)}% completion rate
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Avg. Completion Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.averageCompletionTime.toFixed(0)}</div>
              <div className="text-sm text-gray-500 mt-2">Days to finalize</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Avg. Score Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                +{statistics.averageScoreImprovement.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-2">Per assessment</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600" />
          Engagement Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalGoalsCreated}</div>
              <div className="text-sm text-gray-500 mt-2">Created by users</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Goal Achievement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statistics.goalAchievementRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 mt-2">Success rate</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalResponses.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-2">Question responses</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Evidence Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.totalEvidence.toLocaleString()}</div>
              <div className="text-sm text-gray-500 mt-2">
                {formatBytes(statistics.totalStorageUsed)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            Feature Usage
          </CardTitle>
          <CardDescription>How users interact with platform features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {usage.featureUsage.pdfExports || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">PDF Exports</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {usage.featureUsage.csvExports || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">CSV Exports</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {usage.featureUsage.emailsSent}
              </div>
              <div className="text-sm text-gray-600 mt-1">Emails Sent</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {usage.featureUsage.benchmarkComparisons || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Benchmarks</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {usage.featureUsage.evidenceUploads}
              </div>
              <div className="text-sm text-gray-600 mt-1">Evidence Uploads</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Industries and Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Industries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              Top Industries
            </CardTitle>
            <CardDescription>Industries with most assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usage.topIndustries.slice(0, 5).map((industry, index) => (
                <div key={industry.industry} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{industry.industry}</div>
                      <div className="text-sm text-gray-500">
                        Avg score: {industry.avgScore.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Badge>{industry.count} assessments</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Regions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-teal-600" />
              Top Regions
            </CardTitle>
            <CardDescription>Geographic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usage.topRegions.slice(0, 5).map((region, index) => (
                <div key={region.region} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="font-medium">{region.region}</div>
                  </div>
                  <Badge>{region.count} assessments</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Size Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-pink-600" />
            Company Size Distribution
          </CardTitle>
          <CardDescription>Assessments by organization size</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {usage.companySizeDistribution.map((size) => (
              <div key={size.size} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{size.count}</div>
                <div className="text-sm text-gray-600 mt-1">{size.size}</div>
                <Badge variant="outline" className="mt-2">
                  {size.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Growth Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Monthly Growth Trend
          </CardTitle>
          <CardDescription>Last 12 months of platform growth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usage.monthlyGrowth.slice(-6).map((month) => (
              <div key={month.month} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600">{month.month}</div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Users</div>
                    <div className="text-lg font-semibold">{month.users}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Orgs</div>
                    <div className="text-lg font-semibold">{month.orgs}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Assessments</div>
                    <div className="text-lg font-semibold">{month.assessments}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
