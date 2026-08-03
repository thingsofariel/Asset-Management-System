'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Wrench, ArrowLeftRight, ClipboardCheck, BarChart3, LogOut } from 'lucide-react';
import { getStoredUser, clearSession } from '@/lib/auth';

const modules = [
  {
    icon: Boxes,
    title: 'Assets',
    description: 'Master data, categories, and QR label generation',
    phase: 'Phase 1',
  },
  {
    icon: Wrench,
    title: 'Maintenance',
    description: 'Service schedules, alerts, and history',
    phase: 'Phase 2',
  },
  {
    icon: ArrowLeftRight,
    title: 'Movements',
    description: 'Check-in / check-out, transfers, disposal',
    phase: 'Phase 3',
  },
  {
    icon: ClipboardCheck,
    title: 'Audits',
    description: 'QR-based physical stock takes',
    phase: 'Phase 4',
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Counts, depreciation, cost analysis',
    phase: 'Phase 5',
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

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="bg-primary text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display font-bold text-lg">Asset & Inventory</span>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/80">{user.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-white/80 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">
          Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted text-sm mb-8">
          Foundation is live: authentication and user management are working. Each module below
          comes online as its phase ships.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(({ icon: Icon, title, description, phase }) => (
            <div
              key={title}
              className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-accent" strokeWidth={2} />
                <span className="text-xs font-mono text-muted uppercase tracking-wide">{phase}</span>
              </div>
              <h2 className="font-display font-medium text-primary">{title}</h2>
              <p className="text-sm text-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
