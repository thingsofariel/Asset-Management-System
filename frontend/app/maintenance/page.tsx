'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { MaintenanceSchedule } from '@/lib/types';

function daysUntil(dateStr: string) {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export default function MaintenancePage() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  function load() {
    api.get('/maintenance/schedules').then((res) => setSchedules(res.data));
  }
  useEffect(load, []);

  async function runCheckNow() {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await api.post('/notifications/check-maintenance');
      setCheckResult(`Checked ${res.data.checked} schedule(s), created ${res.data.created} notification(s).`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-2xl text-primary">Maintenance</h1>
          <button
            onClick={runCheckNow}
            disabled={checking}
            className="flex items-center gap-1.5 bg-surface border border-border px-3 py-2 rounded-md text-sm hover:border-accent transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> Run Alert Check Now
          </button>
        </div>

        {checkResult && (
          <p className="text-sm text-accent bg-accent/10 rounded-md px-3 py-2 mb-4">{checkResult}</p>
        )}

        <p className="text-sm text-muted mb-4">
          The system checks automatically every day at 8am and notifies 7 and 3 days before each due
          date. Use the button above to test it immediately instead of waiting.
        </p>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Interval</th>
                <th className="px-4 py-3">Next Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No maintenance schedules set yet. Set one from an asset's detail page.
                  </td>
                </tr>
              )}
              {schedules.map((s) => {
                const days = daysUntil(s.nextDueDate);
                const overdue = days < 0;
                const soon = days >= 0 && days <= 7;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="px-4 py-3">
                      <Link href={`/assets/${s.assetId}`} className="font-medium text-primary hover:text-accent">
                        {s.asset?.name}
                      </Link>
                      <p className="font-mono text-xs text-muted">{s.asset?.assetCode}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      Every {s.intervalMonths} month{s.intervalMonths > 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">{new Date(s.nextDueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {overdue ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full text-status-repair bg-status-repair/10">
                          Overdue by {Math.abs(days)}d
                        </span>
                      ) : soon ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full text-status-maintenance bg-status-maintenance/10">
                          Due in {days}d
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full text-status-good bg-status-good/10">
                          {days}d away
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
