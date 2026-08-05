'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { Movement, MovementType } from '@/lib/types';

const TYPE_LABELS: Record<MovementType, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound / Disposal',
  CHECKOUT: 'Check-Out',
  CHECKIN: 'Check-In',
  TRANSFER: 'Transfer',
};

function describe(m: Movement) {
  switch (m.movementType) {
    case 'CHECKOUT':
      return `→ ${m.toUser?.name ?? 'employee'}`;
    case 'CHECKIN':
      return `Returned${m.toLocation ? ` to ${m.toLocation.room}` : ''}`;
    case 'TRANSFER':
      return `${m.fromLocation?.room ?? '—'} → ${m.toLocation?.room ?? '—'}`;
    case 'INBOUND':
      return m.toLocation ? `Received at ${m.toLocation.room}` : 'Received';
    case 'OUTBOUND':
      return 'Disposed / written off';
    default:
      return '';
  }
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    api.get('/movements').then((res) => setMovements(res.data));
  }, []);

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">Movements</h1>
        <p className="text-sm text-muted mb-6">
          Full accountability log across all assets. Check-out, check-in, transfers, and disposals
          are recorded from each asset's detail page.
        </p>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No movements recorded yet.
                  </td>
                </tr>
              )}
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/assets/${m.assetId}`} className="font-medium text-primary hover:text-accent">
                      {m.asset?.name}
                    </Link>
                    <p className="font-mono text-xs text-muted">{m.asset?.assetCode}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{TYPE_LABELS[m.movementType]}</td>
                  <td className="px-4 py-3 text-muted">{describe(m)}</td>
                  <td className="px-4 py-3 text-muted">{new Date(m.movementDate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
