/**
 * Admin User Management
 * List, search, and manage platform users
 *
 * Phase 5C: Admin Dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
  Mail,
  Shield,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    role: string;
  }>;
  activity: {
    totalLogins: number;
    assessmentsCreated: number;
    assessmentsReviewed: number;
    responsesSubmitted: number;
    lastActivityAt: string | null;
  };
  profileComplete: boolean;
  emailVerified: boolean;
}

interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    owner: number;
    admin: number;
    reviewer: number;
    respondent: number;
    viewer: number;
  };
  newThisMonth: number;
  newThisWeek: number;
  activeThisWeek: number;
  activeThisMonth: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery, roleFilter]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchUsers = async () => {
    try {
      const params: Record<string, any> = {
        page: page.toString(),
        pageSize: '20',
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (roleFilter) {
        params.role = roleFilter;
      }

      const data = await api.admin.getUsers(params) as any;

      setUsers(data.users);
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const data = await api.admin.getAnalytics({ type: 'statistics' });
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-red-100 text-red-700';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700';
      case 'REVIEWER':
        return 'bg-blue-100 text-blue-700';
      case 'RESPONDENT':
        return 'bg-green-100 text-green-700';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  if (loading && !users.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-500 mt-1">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-gray-500 mt-1">Manage platform users and permissions</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{statistics.total.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">All time</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{statistics.active}</div>
              <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">New This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{statistics.newThisMonth}</div>
              <div className="text-xs text-gray-500 mt-1">{statistics.newThisWeek} this week</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{statistics.byRole.admin}</div>
              <div className="text-xs text-gray-500 mt-1">+ {statistics.byRole.owner} owners</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{statistics.inactive}</div>
              <div className="text-xs text-gray-500 mt-1">30+ days</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Roles</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="RESPONDENT">Respondent</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({users.length})
          </CardTitle>
          <CardDescription>Platform user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* User Avatar */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-semibold text-lg flex-shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">
                      {user.name || 'Unnamed User'}
                    </h3>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                    {user.emailVerified && (
                      <UserCheck className="h-4 w-4 text-green-600" />
                    )}
                    {!user.profileComplete && (
                      <UserX className="h-4 w-4 text-orange-600" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {formatDate(user.createdAt)}
                    </span>
                    {user.lastLoginAt && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Last login {formatDate(user.lastLoginAt)}
                      </span>
                    )}
                  </div>

                  {/* Organizations */}
                  {user.organizations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {user.organizations.map((org) => (
                        <Badge key={org.organizationId} variant="outline" className="text-xs">
                          {org.organizationName} ({org.role})
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Activity Stats */}
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{user.activity.totalLogins} logins</span>
                    <span>{user.activity.assessmentsCreated} assessments</span>
                    <span>{user.activity.responsesSubmitted} responses</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <a
                    href={`/admin/users/${user.id}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-100 transition-colors text-center"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
