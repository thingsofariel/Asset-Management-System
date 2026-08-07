'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import PasswordInput from '@/components/PasswordInput';
import { useToast } from '@/components/ToastProvider';
import { generateSecurePassword } from '@/lib/password';
import { Category, Location, Department, AppUser } from '@/lib/types';

type Tab = 'categories' | 'locations' | 'departments' | 'users';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('categories');

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display font-bold text-2xl text-primary mb-6">Settings</h1>

        <div className="flex gap-1 mb-6 border-b border-border">
          {(['categories', 'locations', 'departments', 'users'] as Tab[]).map((t) => (
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
        {tab === 'users' && <UsersTab />}
      </div>
    </main>
  );
}

function CategoriesTab() {
  const toast = useToast();
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
    try {
      await api.post('/categories', { name, assetType });
      setName('');
      toast.success('Category added');
      load();
    } catch {
      toast.error('Could not add category');
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category removed');
      load();
    } catch {
      toast.error('Could not remove category');
    }
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
  const toast = useToast();
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
    try {
      await api.post('/locations', { room, floor: floor || undefined, building: building || undefined });
      setRoom('');
      setFloor('');
      setBuilding('');
      toast.success('Location added');
      load();
    } catch {
      toast.error('Could not add location');
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/locations/${id}`);
      toast.success('Location removed');
      load();
    } catch {
      toast.error('Could not remove location');
    }
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
  const toast = useToast();
  const [items, setItems] = useState<Department[]>([]);
  const [name, setName] = useState('');

  function load() {
    api.get('/departments').then((res) => setItems(res.data));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      await api.post('/departments', { name });
      setName('');
      toast.success('Department added');
      load();
    } catch {
      toast.error('Could not add department');
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Department removed');
      load();
    } catch {
      toast.error('Could not remove department');
    }
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

function UsersTab() {
  const toast = useToast();
  const [items, setItems] = useState<AppUser[]>([]);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get('/users').then((res) => setItems(res.data));
  }
  useEffect(load, []);

  function generatePassword() {
    const generated = generateSecurePassword(12);
    setPassword(generated);
    setConfirmPassword(generated);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !email || password.length < 8) {
      setError('First name, email, and an 8+ character password are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password don\u2019t match.');
      return;
    }
    try {
      await api.post('/users', { name, lastName: lastName || undefined, email, password });
      setName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      toast.success('Person added');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not add person.');
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="text-xs text-muted mb-4">
        People added here can be selected as asset holders when checking out equipment. They
        aren't required to log in to the system.
      </p>
      <form onSubmit={add} className="space-y-3 mb-2">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name (optional)"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <PasswordInput
            value={password}
            onChange={setPassword}
            placeholder="Password (8+ chars)"
            className="rounded-md border border-border px-3 py-2 text-sm"
            autoComplete="new-password"
          />
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm password"
            className="rounded-md border border-border px-3 py-2 text-sm"
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={generatePassword}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Wand2 className="w-3.5 h-3.5" /> Generate secure password
          </button>
          <button className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </form>
      {error && <p className="text-sm text-status-repair mb-2">{error}</p>}
      <ul className="divide-y divide-border">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {u.name} {u.lastName ?? ''} <span className="text-muted">({u.email})</span>
            </span>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted py-2">No one added yet.</p>}
      </ul>
    </div>
  );
}
