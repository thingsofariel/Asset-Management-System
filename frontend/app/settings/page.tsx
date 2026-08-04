'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { Category, Location, Department } from '@/lib/types';

type Tab = 'categories' | 'locations' | 'departments';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <main className="min-h-screen bg-bg">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display font-bold text-2xl text-primary mb-6">Settings</h1>

        <div className="flex gap-1 mb-6 border-b border-border">
          {(['categories', 'locations', 'departments'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${
                tab === t ? 'border-accent text-primary' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'categories' && <CategoriesTab />}
        {tab === 'locations' && <LocationsTab />}
        {tab === 'departments' && <DepartmentsTab />}
      </div>
    </main>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<'FIXED' | 'ELECTRONIC'>('FIXED');

  function load() {
    api.get('/categories').then((res) => setItems(res.data));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    await api.post('/categories', { name, assetType });
    setName('');
    load();
  }

  async function remove(id: string) {
    await api.delete(`/categories/${id}`);
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Desk, Laptop, Air Conditioner"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
        />
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as any)}
          className="rounded-md border border-border px-3 py-2 text-sm bg-surface"
        >
          <option value="FIXED">Fixed</option>
          <option value="ELECTRONIC">Electronic</option>
        </select>
        <button className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
      <ul className="divide-y divide-border">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {c.name} <span className="text-muted">({c.assetType === 'ELECTRONIC' ? 'Electronic' : 'Fixed'})</span>
            </span>
            <button onClick={() => remove(c.id)} className="text-muted hover:text-status-repair">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted py-2">No categories yet.</p>}
      </ul>
    </div>
  );
}

function LocationsTab() {
  const [items, setItems] = useState<Location[]>([]);
  const [room, setRoom] = useState('');
  const [floor, setFloor] = useState('');
  const [building, setBuilding] = useState('');

  function load() {
    api.get('/locations').then((res) => setItems(res.data));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!room) return;
    await api.post('/locations', { room, floor: floor || undefined, building: building || undefined });
    setRoom('');
    setFloor('');
    setBuilding('');
    load();
  }

  async function remove(id: string) {
    await api.delete(`/locations/${id}`);
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="Room"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
        />
        <input
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          placeholder="Floor (optional)"
          className="w-32 rounded-md border border-border px-3 py-2 text-sm"
        />
        <input
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
          placeholder="Building (optional)"
          className="w-32 rounded-md border border-border px-3 py-2 text-sm"
        />
        <button className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
      <ul className="divide-y divide-border">
        {items.map((l) => (
          <li key={l.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {l.room}
              {l.floor ? `, ${l.floor}` : ''}
              {l.building ? ` — ${l.building}` : ''}
            </span>
            <button onClick={() => remove(l.id)} className="text-muted hover:text-status-repair">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted py-2">No locations yet.</p>}
      </ul>
    </div>
  );
}

function DepartmentsTab() {
  const [items, setItems] = useState<Department[]>([]);
  const [name, setName] = useState('');

  function load() {
    api.get('/departments').then((res) => setItems(res.data));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    await api.post('/departments', { name });
    setName('');
    load();
  }

  async function remove(id: string) {
    await api.delete(`/departments/${id}`);
    load();
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. IT, Finance, Operations"
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
        />
        <button className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm">
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
      <ul className="divide-y divide-border">
        {items.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2 text-sm">
            <span>{d.name}</span>
            <button onClick={() => remove(d.id)} className="text-muted hover:text-status-repair">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted py-2">No departments yet.</p>}
      </ul>
    </div>
  );
}
