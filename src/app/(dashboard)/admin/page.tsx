/**
 * Admin Dashboard Overview
 * Main admin page with key metrics and system status
 *
 * Phase 5C: Admin Dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  FileText,
  TrendingUp,
  AlertTriangle,
  Activity,
  Database,
  Shield,
} from 'lucide-react';

interface DashboardMetrics {
  statistics: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    userGrowthRate: number;
    totalOrganizations: number;
    activeOrganizations: number;
    totalAssessments: number;
    finalizedAssessments: number;
    completionRate: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
    }>;
  };
  alerts: Array<{
    id: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    timestamp: string;
  }>;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        fetch('/api/admin/analytics?type=statistics'),
        fetch('/api/admin/health'),
      ]);

      const analyticsData = await analyticsRes.json();
      const healthData = await healthRes.json();

      setMetrics({
        statistics: analyticsData.statistics,
        health: healthData.health,
        alerts: healthData.alerts || [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-red-500 mt-1">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const { statistics, health, alerts } = metrics;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warn':
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'fail':
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-600';
      case 'ERROR':
        return 'bg-red-500';
      case 'WARNING':
        return 'bg-yellow-500';
      case 'INFO':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and system health</p>
      </div>

      {/* System Health Status */}
      <Card className={`border-2 ${getStatusColor(health.status)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8" />
              <div>
                <h3 className="text-lg font-semibold">System Health</h3>
                <p className="text-sm opacity-80">
                  Status: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                </p>
              </div>
            </div>
            <Badge className={getStatusColor(health.status)}>
              {health.checks.filter((c) => c.status === 'pass').length} / {health.checks.length} Checks Passing
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {statistics.activeUsers} active
              </Badge>
              <Badge className="text-xs bg-green-100 text-green-700">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{statistics.newUsersThisMonth} this month
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Organizations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statistics.totalOrganizations.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {statistics.activeOrganizations} with assessments
            </div>
          </CardContent>
        </Card>

        {/* Assessments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Assessments</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statistics.totalAssessments.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {statistics.finalizedAssessments} finalized ({statistics.completionRate.toFixed(1)}%)
            </div>
          </CardContent>
        </Card>

        {/* Growth Rate */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Growth Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              statistics.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {statistics.userGrowthRate >= 0 ? '+' : ''}
              {statistics.userGrowthRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 mt-2">User growth this month</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Health Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Active Alerts
                </CardTitle>
                <CardDescription>System alerts requiring attention</CardDescription>
              </div>
              <Badge>{alerts.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div className={`h-2 w-2 rounded-full mt-2 ${getAlertColor(alert.level)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{alert.title}</span>
                        <Badge className={`text-xs ${getAlertColor(alert.level)} text-white`}>
                          {alert.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Health Checks
            </CardTitle>
            <CardDescription>System component status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {health.checks.map((check, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      check.status === 'pass'
                        ? 'bg-green-500'
                        : check.status === 'warn'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{check.name}</div>
                      <div className="text-xs text-gray-500">{check.message}</div>
                    </div>
                  </div>
                  <Badge
                    className={`${getStatusColor(check.status)}`}
                  >
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/users"
          className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <Users className="h-6 w-6 text-blue-600 mb-2" />
          <h3 className="font-semibold">Manage Users</h3>
          <p className="text-sm text-gray-600 mt-1">View and manage platform users</p>
        </a>

        <a
          href="/admin/analytics"
          className="block p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
        >
          <Activity className="h-6 w-6 text-purple-600 mb-2" />
          <h3 className="font-semibold">View Analytics</h3>
          <p className="text-sm text-gray-600 mt-1">Platform usage and trends</p>
        </a>

        <a
          href="/admin/audit-logs"
          className="block p-4 border rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
        >
          <Database className="h-6 w-6 text-green-600 mb-2" />
          <h3 className="font-semibold">Audit Logs</h3>
          <p className="text-sm text-gray-600 mt-1">View system activity logs</p>
        </a>
      </div>
    </div>
  );
}
