'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Boxes, Wrench, ArrowLeftRight, ClipboardCheck, BarChart3 } from 'lucide-react';
import { getStoredUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';

const modules = [
  {
    icon: Boxes,
    title: 'Assets',
    description: 'Master data, categories, and QR label generation',
    href: '/assets',
    live: true,
  },
  {
    icon: Wrench,
    title: 'Maintenance',
    description: 'Service schedules, alerts, and history',
    href: '/maintenance',
    live: true,
  },
  {
    icon: ArrowLeftRight,
    title: 'Movements',
    description: 'Check-in / check-out, transfers, disposal',
    phase: 'Phase 3',
    live: false,
  },
  {
    icon: ClipboardCheck,
    title: 'Audits',
    description: 'QR-based physical stock takes',
    phase: 'Phase 4',
    live: false,
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Counts, depreciation, cost analysis',
    phase: 'Phase 5',
    live: false,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push('/login');
      return;
    }
    setUser(stored);
  }, [router]);

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">
          Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted text-sm mb-8">
          Assets and Maintenance are live. Remaining modules come online as their phase ships.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(({ icon: Icon, title, description, href, phase, live }) => {
            const card = (
              <div
                className={`bg-surface border border-border rounded-lg p-5 flex flex-col gap-2 h-full transition ${
                  live ? 'hover:border-accent cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 text-accent" strokeWidth={2} />
                  <span className="text-xs font-mono text-muted uppercase tracking-wide">
                    {live ? 'Live' : phase}
                  </span>
                </div>
                <h2 className="font-display font-medium text-primary">{title}</h2>
                <p className="text-sm text-muted">{description}</p>
              </div>
            );
            return live ? (
              <Link key={title} href={href!}>
                {card}
              </Link>
            ) : (
              <div key={title}>{card}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
