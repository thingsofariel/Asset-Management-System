'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Boxes, Wrench, ArrowLeftRight, ClipboardCheck, BarChart3, AlertTriangle, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import { DashboardSummary } from '@/lib/types';

const modules = [
  { icon: Boxes, title: 'Assets', description: 'Master data, categories, and QR label generation', href: '/assets' },
  { icon: Wrench, title: 'Maintenance', description: 'Service schedules, alerts, and history', href: '/maintenance' },
  { icon: ArrowLeftRight, title: 'Movements', description: 'Check-in / check-out, transfers, disposal', href: '/movements' },
  { icon: ClipboardCheck, title: 'Audits', description: 'QR-based physical stock takes', href: '/audits' },
  { icon: BarChart3, title: 'Reports', description: 'Counts, depreciation, cost analysis', href: '/reports' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(stored);
    api.get('/reports/dashboard-summary').then((res) => setSummary(res.data));
  }, [router]);

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">
          Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted text-sm mb-6">Here's the current state of Fortuna office inventory.</p>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-muted text-sm mb-1">
                <Boxes className="w-4 h-4" /> Total Assets
              </div>
              <p className="font-display font-bold text-2xl text-primary">{summary.totalAssets}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-muted text-sm mb-1">
                <AlertTriangle className="w-4 h-4" /> Damaged / Under Repair
              </div>
              <p className="font-display font-bold text-2xl text-status-repair">{summary.damagedCount}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-muted text-sm mb-1">
                <Clock className="w-4 h-4" /> Service Due in 30 Days
              </div>
              <p className="font-display font-bold text-2xl text-status-maintenance">{summary.upcomingMaintenance}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(({ icon: Icon, title, description, href }) => (
            <Link key={title} href={href}>
              <div className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-2 h-full hover:border-accent transition cursor-pointer">
                <Icon className="w-5 h-5 text-accent" strokeWidth={2} />
                <h2 className="font-display font-medium text-primary">{title}</h2>
                <p className="text-sm text-muted">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
