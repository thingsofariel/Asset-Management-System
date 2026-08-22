'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Headset, Search, ListChecks } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import { getStoredUser } from '@/lib/auth';
import { dashboardStats, STATUS_META, RequestStatus } from '@/lib/helpdesk';

interface DashboardData {
  totalCount: number;
  statusCounts: { status: RequestStatus; count: number }[];
  priorityCounts: { priority: string; count: number }[];
  avgResolutionHours: number | null;
  requestsByCategory: { category: string; count: number }[];
  avgRating: number | null;
  reviewCount: number;
}

export default function HelpdeskLandingPage() {
  const user = getStoredUser();

  // An EMPLOYEE can't reach the admin dashboard endpoint at all (backend
  // RBAC blocks it) — rather than show an error, just point them at the
  // two things they'd actually want here.
  if (user?.role !== 'ADMIN') {
    return (
      <main className="min-h-screen bg-bg pl-20">
        <AppHeader />
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Headset className="w-6 h-6" strokeWidth={2} />
          </div>
          <h1 className="font-display font-bold text-xl text-primary mb-2">Help Desk</h1>
          <p className="text-sm text-muted mb-6">Submit a new IT request, or check on one you already sent in.</p>
          <div className="flex flex-col gap-3">
            <a href="/help" className="bg-primary text-white rounded-md py-2.5 text-sm font-medium">
              Submit a request
            </a>
            <a href="/help/track" className="border border-border rounded-md py-2.5 text-sm font-medium">
              Track a request
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    dashboardStats().then(setData);
  }, []);

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">Help Desk</h1>
        <p className="text-muted text-sm mb-6">All-time overview of IT support requests.</p>

        {!data ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total requests" value={data.totalCount} />
              <StatCard
                label="Avg. resolution"
                value={data.avgResolutionHours != null ? `${data.avgResolutionHours}h` : '—'}
              />
              <StatCard label="Avg. rating" value={data.avgRating != null ? `${data.avgRating} / 5` : '—'} />
              <StatCard label="Reviews" value={data.reviewCount} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-surface border border-border rounded-lg p-5">
                <h2 className="font-medium text-sm text-text mb-4">By status</h2>
                <div className="space-y-2">
                  {data.statusCounts.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${STATUS_META[s.status].dot}`} />
                        {STATUS_META[s.status].label}
                      </span>
                      <span className="text-muted">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border rounded-lg p-5">
                <h2 className="font-medium text-sm text-text mb-4">By category</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.requestsByCategory} layout="vertical" margin={{ left: 24 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/helpdesk/queue" className="flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2.5 text-sm font-medium">
                <ListChecks className="w-4 h-4" /> Open the queue
              </Link>
              <a href="/help/track" className="flex items-center gap-2 border border-border rounded-md px-4 py-2.5 text-sm font-medium">
                <Search className="w-4 h-4" /> Look up a request
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-display font-bold text-2xl text-primary">{value}</p>
    </div>
  );
}
