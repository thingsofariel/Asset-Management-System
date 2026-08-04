'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ScanLine, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { Audit, AuditItem } from '@/lib/types';

const STATUS_STYLE: Record<string, string> = {
  MATCHED: 'text-status-good bg-status-good/10',
  MISMATCH: 'text-status-maintenance bg-status-maintenance/10',
  NOT_FOUND: 'text-status-repair bg-status-repair/10',
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(`/audits/${id}`);
    setAudit(res.data);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function completeAudit() {
    if (!confirm('Complete this audit? Any unscanned items will be marked "Not Found".')) return;
    setCompleting(true);
    try {
      await api.patch(`/audits/${id}/complete`);
      load();
    } finally {
      setCompleting(false);
    }
  }

  if (!audit) {
    return (
      <main className="min-h-screen bg-bg">
        <AppHeader />
        <div className="max-w-3xl mx-auto px-6 py-8 text-muted text-sm">Loading…</div>
      </main>
    );
  }

  const items = audit.items ?? [];
  const scannedCount = items.filter((i) => i.scannedAt).length;
  const mismatchCount = items.filter((i) => i.matchStatus === 'MISMATCH').length;
  const notFoundCount = items.filter((i) => i.matchStatus === 'NOT_FOUND').length;

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/audits" className="text-sm text-muted hover:text-text">
          ← Back to Audits
        </Link>
        <div className="flex items-center justify-between mt-1 mb-6">
          <h1 className="font-display font-bold text-2xl text-primary">{audit.name}</h1>
          <div className="flex gap-2">
            {audit.status === 'IN_PROGRESS' && (
              <>
                <Link
                  href={`/audits/${id}/scan`}
                  className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition"
                >
                  <ScanLine className="w-4 h-4" /> Scan Items
                </Link>
                <button
                  onClick={completeAudit}
                  disabled={completing}
                  className="flex items-center gap-1.5 bg-surface border border-border px-3 py-2 rounded-md text-sm hover:border-accent transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> Complete Audit
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Scanned" value={`${scannedCount}/${items.length}`} />
          <StatCard label="Matched" value={items.filter((i) => i.matchStatus === 'MATCHED').length} good />
          <StatCard label="Mismatched" value={mismatchCount} warn />
          <StatCard label="Not Found" value={notFoundCount} bad />
        </div>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Expected Location</th>
                <th className="px-4 py-3">Scanned Location</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: AuditItem) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/assets/${item.assetId}`} className="font-medium text-primary hover:text-accent">
                      {item.asset?.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{item.expectedLocation?.room ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{item.scannedLocation?.room ?? '—'}</td>
                  <td className="px-4 py-3">
                    {item.matchStatus ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[item.matchStatus]}`}>
                        {item.matchStatus === 'NOT_FOUND' ? 'Not Found' : item.matchStatus === 'MISMATCH' ? 'Mismatch' : 'Matched'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, good, warn, bad }: { label: string; value: string | number; good?: boolean; warn?: boolean; bad?: boolean }) {
  const color = good ? 'text-status-good' : warn ? 'text-status-maintenance' : bad ? 'text-status-repair' : 'text-primary';
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <p className={`font-display font-bold text-xl ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}
