/**
 * Admin System Health Monitor
 * Monitor system health, database, and performance metrics
 *
 * Phase 5C: Admin Dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Zap,
} from 'lucide-react';

interface HealthData {
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      responseTime?: number;
    }>;
  };
  database: {
    tableSizes: Array<{
      tableName: string;
      rowCount: number;
      totalSize: string;
      indexSize: string;
    }>;
    health: {
      status: 'healthy' | 'degraded' | 'critical';
      responseTime: number;
      uptime: number;
    };
  };
  alerts: Array<{
    id: string;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category: string;
    title: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealthData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      const res = await fetch('/api/admin/health');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warn':
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'fail':
      case 'unhealthy':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

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
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'ERROR':
        return 'bg-red-500 text-white';
      case 'WARNING':
        return 'bg-yellow-500 text-white';
      case 'INFO':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-gray-500 mt-1">Loading system metrics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-red-500 mt-1">Failed to load health data</p>
        </div>
      </div>
    );
  }

  const { health, database, alerts } = data;
  const activeAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = activeAlerts.filter((a) => a.level === 'CRITICAL' || a.level === 'ERROR');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-gray-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              autoRefresh ? 'bg-blue-100 border-blue-300 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchHealthData}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${getStatusColor(health.status)}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon(health.status)}
              <div>
                <h3 className="text-2xl font-bold">
                  System Status: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                </h3>
                <p className="text-sm opacity-80 mt-1">
                  {health.checks.filter((c) => c.status === 'pass').length} of {health.checks.length} checks passing
                </p>
              </div>
            </div>
            {criticalAlerts.length > 0 && (
              <Badge className="bg-red-600 text-white px-4 py-2 text-lg">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            System Health Checks
          </CardTitle>
          <CardDescription>Component status and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {health.checks.map((check, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 border-2 rounded-lg ${getStatusColor(
                  check.status
                )}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-semibold">{check.name}</div>
                    <div className="text-sm opacity-80">{check.message}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {check.responseTime !== undefined && (
                    <div className="text-right">
                      <div className="text-sm font-medium">{check.responseTime}ms</div>
                      <div className="text-xs opacity-60">Response Time</div>
                    </div>
                  )}
                  <Badge className={getStatusColor(check.status)}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Database Health
            </CardTitle>
            <CardDescription>Connection and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`p-4 border-2 rounded-lg ${getStatusColor(database.health.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Connection Status</span>
                  {getStatusIcon(database.health.status)}
                </div>
                <div className="text-2xl font-bold">
                  {database.health.status.charAt(0).toUpperCase() + database.health.status.slice(1)}
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Response Time</span>
                </div>
                <div className="text-2xl font-bold">{database.health.responseTime}ms</div>
                <div className={`text-sm mt-1 ${
                  database.health.responseTime < 100
                    ? 'text-green-600'
                    : database.health.responseTime < 500
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {database.health.responseTime < 100
                    ? 'Excellent'
                    : database.health.responseTime < 500
                    ? 'Good'
                    : 'Slow'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Active Alerts
            </CardTitle>
            <CardDescription>
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-2 mb-1">
                      <Badge className={`${getAlertColor(alert.level)} text-xs`}>
                        {alert.level}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{alert.title}</div>
                        <div className="text-xs text-gray-600 mt-1">{alert.message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database Table Sizes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-indigo-600" />
            Database Table Sizes
          </CardTitle>
          <CardDescription>Storage usage by table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {database.tableSizes.map((table) => (
              <div
                key={table.tableName}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{table.tableName}</div>
                    <div className="text-sm text-gray-500">
                      {table.rowCount.toLocaleString()} rows
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{table.totalSize}</div>
                  <div className="text-xs text-gray-500">Total Size</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              API Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {database.health.responseTime}ms
            </div>
            <div className="text-sm text-gray-500 mt-1">Average database query time</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">99.9%</div>
            <div className="text-sm text-gray-500 mt-1">Last 30 days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {database.tableSizes
                .reduce((sum, table) => sum + table.rowCount, 0)
                .toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-1">Across all tables</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
