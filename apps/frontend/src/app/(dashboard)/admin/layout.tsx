/**
 * Admin Dashboard Layout
 * Layout wrapper for admin section with navigation
 *
 * Phase 5C: Admin Dashboard
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Activity,
  Shield,
  FileText,
  Settings,
  AlertTriangle,
} from 'lucide-react';

const adminNavigation = [
  {
    name: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: Activity,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileText,
  },
  {
    name: 'System Health',
    href: '/admin/health',
    icon: Shield,
  },
  {
    name: 'Error Logs',
    href: '/admin/errors',
    icon: AlertTriangle,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs text-gray-500">Platform Management</p>
            </div>
          </div>

          <nav className="space-y-1">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Admin Badge */}
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="text-xs font-semibold text-red-900">Admin Access</span>
            </div>
            <p className="text-xs text-red-700">
              You have full platform access. Use responsibly.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex-1">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
