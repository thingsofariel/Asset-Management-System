'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ScanLine } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { Audit } from '@/lib/types';

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function load() {
    api.get('/audits').then((res) => setAudits(res.data));
  }
  useEffect(load, []);

  async function createAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setCreating(true);
    try {
      await api.post('/audits', { name });
      setName('');
      setShowForm(false);
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-2xl text-primary">Audits</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" /> Start New Audit
          </button>
        </div>

        {showForm && (
          <form onSubmit={createAudit} className="bg-surface border border-border rounded-lg p-4 mb-6 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 2026 Office Stock Take"
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {creating ? 'Starting…' : 'Start'}
            </button>
          </form>
        )}
        <p className="text-sm text-muted mb-4">
          Starting an audit snapshots every active asset's expected location. Scan QR codes from a
          phone to check items off as you find them.
        </p>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No audits yet.
                  </td>
                </tr>
              )}
              {audits.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3 font-medium text-primary">
                    <Link href={`/audits/${a.id}`}>{a.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.startDate ? new Date(a.startDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        a.status === 'COMPLETED'
                          ? 'text-status-good bg-status-good/10'
                          : 'text-status-maintenance bg-status-maintenance/10'
                      }`}
                    >
                      {a.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{a._count?.items ?? 0}</td>
                  <td className="px-4 py-3">
                    {a.status === 'IN_PROGRESS' && (
                      <Link
                        href={`/audits/${a.id}/scan`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <ScanLine className="w-4 h-4" /> Scan
                      </Link>
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
