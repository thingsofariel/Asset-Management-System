'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Boxes,
  Wrench,
  ArrowLeftRight,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import { Asset, DashboardSummary, MaintenanceSchedule, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';

const modules = [
  { icon: Boxes, title: 'Assets', description: 'Master data, categories, and QR label generation', href: '/assets' },
  { icon: Wrench, title: 'Maintenance', description: 'Service schedules, alerts, and history', href: '/maintenance' },
  { icon: ArrowLeftRight, title: 'Movements', description: 'Check-in / check-out, transfers, disposal', href: '/movements' },
  { icon: ClipboardCheck, title: 'Audits', description: 'QR-based physical stock takes', href: '/audits' },
  { icon: BarChart3, title: 'Reports', description: 'Counts, depreciation, cost analysis', href: '/reports' },
];

// Distinct from the badge colors in lib/types — a donut needs every slice to
// read apart, so DISPOSED gets its own gray rather than sharing UNSERVICEABLE's.
const CHART_COLORS: Record<string, string> = {
  GOOD: 'var(--color-status-good)',
  REQUIRES_MAINTENANCE: 'var(--color-status-maintenance)',
  UNDER_REPAIR: 'var(--color-status-repair)',
  UNSERVICEABLE: 'var(--color-status-scrap)',
  DISPOSED: '#4B5563',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [damagedAssets, setDamagedAssets] = useState<Asset[]>([]);
  const [dueSoonSchedules, setDueSoonSchedules] = useState<MaintenanceSchedule[]>([]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(stored);
    api.get('/assets/reports/dashboard-summary').then((res) => setSummary(res.data));
    api.get('/assets').then((res) => setRecentAssets(res.data.slice(0, 5)));

    Promise.all([
      api.get('/assets', { params: { status: 'UNDER_REPAIR' } }),
      api.get('/assets', { params: { status: 'UNSERVICEABLE' } }),
    ]).then(([repair, unserviceable]) => {
      setDamagedAssets([...repair.data, ...unserviceable.data].slice(0, 5));
    });

    api.get('/maintenance/schedules').then((res) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueSoon = (res.data as MaintenanceSchedule[]).filter((s) => {
        const due = new Date(s.nextDueDate);
        due.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((due.getTime() - today.getTime()) / 86400000);
        return daysUntil <= 7;
      });
      setDueSoonSchedules(dueSoon.slice(0, 5));
    });
  }, [router]);

  const statusData = summary
    ? Object.entries(summary.byStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ status, count }))
    : [];

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">
          Welcome{user ? `, ${user.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted text-sm mb-6">Here's the current state of your office inventory.</p>

        {/* Hero KPI row — three cards of deliberately different visual weight */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-primary text-white rounded-xl p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Total Assets</span>
                <Boxes className="w-4 h-4 text-white/60" />
              </div>
              <p className="font-display font-bold text-3xl">{summary.totalAssets}</p>
            </div>

            <div className="bg-status-repair text-white rounded-xl p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Damaged / Under Repair</span>
                <AlertTriangle className="w-4 h-4 text-white/80" />
              </div>
              <p className="font-display font-bold text-3xl">{summary.damagedCount}</p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Service Due in 30 Days</span>
                <Clock className="w-4 h-4 text-status-maintenance" />
              </div>
              <p className="font-display font-bold text-3xl text-status-maintenance">
                {summary.upcomingMaintenance}
              </p>
            </div>
          </div>
        )}

        {/* Proactive alerts — specific items needing action, not just counts */}
        {(damagedAssets.length > 0 || dueSoonSchedules.length > 0) && (
          <div className="bg-surface border border-status-maintenance/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-status-maintenance" />
              <h2 className="font-display font-medium text-primary">Attention Needed</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              {dueSoonSchedules.map((s) => {
                const daysUntil = Math.round(
                  (new Date(s.nextDueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000,
                );
                return (
                  <Link
                    key={s.id}
                    href={`/assets/${s.assetId}`}
                    className="flex items-center justify-between py-1.5 text-sm hover:text-accent transition"
                  >
                    <span className="truncate">{s.asset?.name}</span>
                    <span className={`text-xs flex-shrink-0 ml-2 ${daysUntil < 0 ? 'text-status-repair' : 'text-status-maintenance'}`}>
                      {daysUntil < 0 ? `Overdue ${Math.abs(daysUntil)}d` : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`}
                    </span>
                  </Link>
                );
              })}
              {damagedAssets.map((a) => (
                <Link
                  key={a.id}
                  href={`/assets/${a.id}`}
                  className="flex items-center justify-between py-1.5 text-sm hover:text-accent transition"
                >
                  <span className="truncate">{a.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${STATUS_COLORS[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent assets + status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-medium text-primary">Recently Added</h2>
              <Link href="/assets" className="flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {recentAssets.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentAssets.map((asset) => (
                  <li key={asset.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <Link href={`/assets/${asset.id}`} className="font-medium text-text hover:text-accent truncate block">
                        {asset.name}
                      </Link>
                      <p className="font-mono text-xs text-muted">{asset.assetCode}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-muted text-xs hidden sm:inline">{asset.category?.name ?? '—'}</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[asset.status]}`}>
                        {STATUS_LABELS[asset.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted py-6 text-center">No assets yet.</p>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-display font-medium text-primary mb-3">Assets by Status</h2>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={CHART_COLORS[entry.status] ?? '#9CA3AF'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-2 space-y-1.5">
                  {statusData.map((entry) => (
                    <li key={entry.status} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-muted">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: CHART_COLORS[entry.status] }}
                        />
                        {STATUS_LABELS[entry.status as keyof typeof STATUS_LABELS]}
                      </span>
                      <span className="font-medium text-text">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted py-6 text-center">No assets yet.</p>
            )}
          </div>
        </div>

        {/* Module navigation */}
        <h2 className="font-display font-medium text-primary mb-3">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(({ icon: Icon, title, description, href }) => (
            <Link key={title} href={href}>
              <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2 h-full hover:border-accent transition cursor-pointer">
                <Icon className="w-5 h-5 text-accent" strokeWidth={2} />
                <h3 className="font-display font-medium text-primary">{title}</h3>
                <p className="text-sm text-muted">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
