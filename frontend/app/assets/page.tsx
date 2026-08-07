'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Printer, Search, QrCode, MoveRight, Trash2, Columns3, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import AppHeader from '@/components/AppHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';
import { Asset, Category, Location, AssetStatus, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';

type Preset = 'all' | 'damaged' | 'maintenance' | 'due-this-month';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'damaged', label: 'Damaged' },
  { key: 'maintenance', label: 'Needs Maintenance' },
  { key: 'due-this-month', label: 'Due This Month' },
];

const COLUMNS_STORAGE_KEY = 'assets-table-columns';

export default function AssetsPage() {
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [preset, setPreset] = useState<Preset>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [bulkMoveLocationId, setBulkMoveLocationId] = useState('');
  const [confirmBulkDispose, setConfirmBulkDispose] = useState(false);
  const [columns, setColumns] = useState({ category: true, location: true });

  useEffect(() => {
    const stored = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (stored) {
      try {
        setColumns(JSON.parse(stored));
      } catch {
        // ignore malformed stored value
      }
    }
  }, []);

  function toggleColumn(key: 'category' | 'location') {
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryFilter) params.categoryId = categoryFilter;
    if (preset === 'damaged') params.status = 'UNDER_REPAIR';
    if (preset === 'maintenance') params.status = 'REQUIRES_MAINTENANCE';
    if (preset === 'due-this-month') params.dueThisMonth = 'true';
    const res = await api.get('/assets', { params });
    setAssets(res.data);
    setLoading(false);
  }, [search, categoryFilter, preset]);

  useEffect(() => {
    if (!getStoredUser()) {
      router.push('/login');
      return;
    }
    api.get('/categories').then((res) => setCategories(res.data));
    api.get('/locations').then((res) => setLocations(res.data));
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

  async function updateStatus(assetId: string, status: AssetStatus) {
    try {
      await api.patch(`/assets/${assetId}`, { status });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, status } : a)));
      toast.success('Status updated');
    } catch {
      toast.error('Could not update status');
    } finally {
      setEditingStatusId(null);
    }
  }

  async function bulkMove() {
    if (!bulkMoveLocationId || selected.size === 0) return;
    try {
      await Promise.all(
        Array.from(selected).map((assetId) =>
          api.post('/movements', { assetId, movementType: 'TRANSFER', toLocationId: bulkMoveLocationId }),
        ),
      );
      toast.success(`Moved ${selected.size} asset${selected.size > 1 ? 's' : ''}`);
      setSelected(new Set());
      setShowBulkMove(false);
      setBulkMoveLocationId('');
      loadAssets();
    } catch {
      toast.error('Some items could not be moved');
    }
  }

  async function bulkDispose() {
    try {
      await Promise.all(
        Array.from(selected).map((assetId) => api.post('/movements', { assetId, movementType: 'OUTBOUND' })),
      );
      toast.success(`Disposed ${selected.size} asset${selected.size > 1 ? 's' : ''}`);
      setSelected(new Set());
      loadAssets();
    } catch {
      toast.error('Some items could not be disposed');
    } finally {
      setConfirmBulkDispose(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-bold text-2xl text-primary">Assets</h1>
          <Link
            href="/assets/new"
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" /> New Asset
          </Link>
        </div>

        {/* Quick filter presets */}
        <div className="flex gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                preset === p.key
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, serial number, category…"
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

          <div className="relative">
            <button
              onClick={() => setShowColumnsMenu((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm bg-surface hover:border-accent transition"
            >
              <Columns3 className="w-4 h-4" /> Columns <ChevronDown className="w-3 h-3" />
            </button>
            {showColumnsMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-surface border border-border rounded-md shadow-lg z-20 p-2">
                <label className="flex items-center gap-2 text-sm px-2 py-1.5 hover:bg-bg rounded cursor-pointer">
                  <input type="checkbox" checked={columns.category} onChange={() => toggleColumn('category')} />
                  Category
                </label>
                <label className="flex items-center gap-2 text-sm px-2 py-1.5 hover:bg-bg rounded cursor-pointer">
                  <input type="checkbox" checked={columns.location} onChange={() => toggleColumn('location')} />
                  Location
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 mb-4 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
            <span className="text-sm text-primary font-medium mr-2">{selected.size} selected</span>
            <button
              onClick={printSelected}
              className="flex items-center gap-1.5 bg-surface border border-border text-text px-3 py-1.5 rounded-md text-xs hover:border-accent transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print Labels
            </button>
            <div className="relative">
              <button
                onClick={() => setShowBulkMove((s) => !s)}
                className="flex items-center gap-1.5 bg-surface border border-border text-text px-3 py-1.5 rounded-md text-xs hover:border-accent transition"
              >
                <MoveRight className="w-3.5 h-3.5" /> Move to…
              </button>
              {showBulkMove && (
                <div className="absolute left-0 mt-1 w-56 bg-surface border border-border rounded-md shadow-lg z-20 p-2">
                  <select
                    value={bulkMoveLocationId}
                    onChange={(e) => setBulkMoveLocationId(e.target.value)}
                    className="w-full rounded-md border border-border px-2 py-1.5 text-xs mb-2 bg-surface"
                  >
                    <option value="">Select location</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.room}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={bulkMove}
                    disabled={!bulkMoveLocationId}
                    className="w-full bg-primary text-white text-xs py-1.5 rounded-md disabled:opacity-40"
                  >
                    Confirm Move
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setConfirmBulkDispose(true)}
              className="flex items-center gap-1.5 bg-surface border border-border text-status-repair px-3 py-1.5 rounded-md text-xs hover:border-status-repair transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Dispose
            </button>
          </div>
        )}

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted text-xs uppercase tracking-wide">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                {columns.category && <th className="px-4 py-3">Category</th>}
                {columns.location && <th className="px-4 py-3">Location</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && assets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No assets found.
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
                  {columns.category && <td className="px-4 py-3 text-muted">{asset.category?.name ?? '—'}</td>}
                  {columns.location && <td className="px-4 py-3 text-muted">{asset.location?.room ?? '—'}</td>}
                  <td className="px-4 py-3">
                    {editingStatusId === asset.id ? (
                      <select
                        autoFocus
                        defaultValue={asset.status}
                        onChange={(e) => updateStatus(asset.id, e.target.value as AssetStatus)}
                        onBlur={() => setEditingStatusId(null)}
                        className="text-xs rounded-md border border-border px-2 py-1 bg-surface"
                      >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingStatusId(asset.id)}
                        title="Click to change status"
                        className={`text-xs font-medium px-2 py-1 rounded-full hover:ring-2 hover:ring-accent/40 transition ${STATUS_COLORS[asset.status]}`}
                      >
                        {STATUS_LABELS[asset.status]}
                      </button>
                    )}
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

      <ConfirmDialog
        open={confirmBulkDispose}
        title={`Dispose ${selected.size} asset${selected.size > 1 ? 's' : ''}?`}
        message="This marks every selected asset as disposed / written off. This cannot be undone from here."
        confirmWord="DISPOSE"
        onConfirm={bulkDispose}
        onCancel={() => setConfirmBulkDispose(false)}
      />
    </main>
  );
}
