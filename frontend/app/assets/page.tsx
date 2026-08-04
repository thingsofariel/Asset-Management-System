'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Printer, Search, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import { Asset, Category, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (statusFilter) params.status = statusFilter;
    const res = await api.get('/assets', { params });
    setAssets(res.data);
    setLoading(false);
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    if (!getStoredUser()) {
      router.push('/login');
      return;
    }
    api.get('/categories').then((res) => setCategories(res.data));
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(loadAssets, 250); // debounce search typing
    return () => clearTimeout(timeout);
  }, [loadAssets]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function printSelected() {
    if (selected.size === 0) return;
    router.push(`/assets/print?ids=${Array.from(selected).join(',')}`);
  }

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-2xl text-primary">Assets</h1>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={printSelected}
                className="flex items-center gap-1.5 bg-surface border border-border text-text px-3 py-2 rounded-md text-sm hover:border-accent transition"
              >
                <Printer className="w-4 h-4" /> Print {selected.size} Label{selected.size > 1 ? 's' : ''}
              </button>
            )}
            <Link
              href="/assets/new"
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" /> New Asset
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, serial number…"
              className="w-full pl-9 pr-3 py-2 rounded-md border border-border text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-border text-sm bg-surface"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-border text-sm bg-surface"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No assets found. Create your first one to get started.
                  </td>
                </tr>
              )}
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(asset.id)}
                      onChange={() => toggleSelect(asset.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{asset.assetCode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/assets/${asset.id}`} className="font-medium text-primary hover:text-accent">
                      {asset.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{asset.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{asset.location?.room ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[asset.status]}`}>
                      {STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/assets/${asset.id}`} title="View QR">
                      <QrCode className="w-4 h-4 text-muted hover:text-accent" />
                    </Link>
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
