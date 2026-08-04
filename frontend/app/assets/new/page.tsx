'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { Category, Location, Department } from '@/lib/types';

export default function NewAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    locationId: '',
    departmentId: '',
    purchaseDate: '',
    purchaseCost: '',
    warrantyExpiry: '',
    brand: '',
    serialNumber: '',
    cpu: '',
    ram: '',
    storage: '',
  });

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
    api.get('/locations').then((res) => setLocations(res.data));
    api.get('/departments').then((res) => setDepartments(res.data));
  }, []);

  const selectedCategory = categories.find((c) => c.id === form.categoryId);
  const isElectronic = selectedCategory?.assetType === 'ELECTRONIC';

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.categoryId) {
      setError('Name and category are required.');
      return;
    }

    setSaving(true);
    try {
      const specifications: Record<string, string> = {};
      if (form.cpu) specifications.cpu = form.cpu;
      if (form.ram) specifications.ram = form.ram;
      if (form.storage) specifications.storage = form.storage;

      const res = await api.post('/assets', {
        name: form.name,
        categoryId: form.categoryId,
        assetType: selectedCategory?.assetType ?? 'FIXED',
        locationId: form.locationId || undefined,
        departmentId: form.departmentId || undefined,
        purchaseDate: form.purchaseDate || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        brand: isElectronic ? form.brand || undefined : undefined,
        serialNumber: isElectronic ? form.serialNumber || undefined : undefined,
        specifications: isElectronic && Object.keys(specifications).length ? specifications : undefined,
      });
      router.push(`/assets/${res.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not create asset.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display font-bold text-2xl text-primary mb-1">New Asset</h1>
        <p className="text-sm text-muted mb-6">
          A QR code label is generated automatically once the asset is created.
        </p>

        {categories.length === 0 && (
          <div className="bg-status-maintenance/10 text-status-maintenance text-sm rounded-md p-3 mb-6">
            No categories yet — add one in{' '}
            <Link href="/settings" className="underline font-medium">
              Settings
            </Link>{' '}
            before creating an asset.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Meeting Room AC Unit"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.assetType === 'ELECTRONIC' ? 'Electronic' : 'Fixed'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <select
                value={form.locationId}
                onChange={(e) => update('locationId', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
              >
                <option value="">None</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.room}
                    {l.floor ? `, ${l.floor}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={(e) => update('departmentId', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Cost</label>
              <input
                type="number"
                value={form.purchaseCost}
                onChange={(e) => update('purchaseCost', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => update('purchaseDate', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Warranty Expiry</label>
              <input
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) => update('warrantyExpiry', e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {isElectronic && (
            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-sm font-medium text-primary">Electronic asset details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => update('brand', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Serial Number</label>
                  <input
                    value={form.serialNumber}
                    onChange={(e) => update('serialNumber', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CPU</label>
                  <input
                    value={form.cpu}
                    onChange={(e) => update('cpu', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">RAM</label>
                  <input
                    value={form.ram}
                    onChange={(e) => update('ram', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Storage</label>
                  <input
                    value={form.storage}
                    onChange={(e) => update('storage', e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-status-repair">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-white font-medium rounded-md px-4 py-2 text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Asset'}
            </button>
            <Link
              href="/assets"
              className="text-sm text-muted hover:text-text px-4 py-2 flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
