'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Copy, Check, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import { useToast } from '@/components/ToastProvider';
import { getStoredUser, saveSession, StoredUser } from '@/lib/auth';
import { Category, Location, Department, AppUser } from '@/lib/types';

type Tab = 'profile' | 'categories' | 'locations' | 'departments' | 'users';

// Everyone gets Profile; the rest are admin-only management tabs the
// backend would reject anyway for an EMPLOYEE — no point showing them.
function tabsFor(role: string | undefined): Tab[] {
  return role === 'ADMIN' ? ['profile', 'categories', 'locations', 'departments', 'users'] : ['profile'];
}

export default function SettingsPage() {
  const user = getStoredUser();
  const [tab, setTab] = useState<Tab>('profile');
  const tabs = tabsFor(user?.role);

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display font-bold text-2xl text-primary mb-6">Settings</h1>

        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((t) => (
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

        {tab === 'profile' && <ProfileTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'locations' && <LocationsTab />}
        {tab === 'departments' && <DepartmentsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </main>

  );
}

function initialsFor(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase();
}

const MAX_AVATAR_MB = 3;

function ProfileTab() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<StoredUser | null>(getStoredUser());

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  // Keeps localStorage (and therefore the rest of the app — AppHeader,
  // etc.) in sync with whatever the backend just confirmed, since the
  // session persists across refreshes and would otherwise go stale.
  function syncSession(updated: StoredUser) {
    const token = window.localStorage.getItem('accessToken');
    if (token) saveSession(token, updated);
    setUser(updated);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG, JPEG, WEBP, or GIF).');
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`Image is too large — max ${MAX_AVATAR_MB}MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setAvatarUploading(true);
    try {
      const res = await api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      syncSession(res.data);
      toast.success('Profile picture updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not upload image.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch('/users/me', { fullName, email });
      syncSession(res.data);
      toast.success("Saved — you're all set.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save changes.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not update password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-surface border border-border rounded-lg p-5">
        <p className="text-xs text-muted mb-4">Profile picture</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="group relative w-16 h-16 shrink-0 overflow-hidden rounded-full border border-border bg-primary/10 disabled:opacity-60"
            aria-label="Change profile picture"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-lg font-semibold text-primary">
                {initialsFor(user?.fullName)}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
              <Camera className="w-4 h-4 text-white" />
            </span>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="border border-border rounded-md px-3 py-1.5 text-xs font-medium"
            >
              {avatarUploading ? 'Uploading…' : 'Change photo'}
            </button>
            <p className="text-xs text-muted mt-1.5">PNG, JPEG, WEBP, or GIF — max {MAX_AVATAR_MB}MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="bg-surface border border-border rounded-lg p-5 space-y-3">
        <p className="text-xs text-muted">Account details</p>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
        />
        <button disabled={savingProfile} className="bg-primary text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="bg-surface border border-border rounded-lg p-5 space-y-3">
        <p className="text-xs text-muted">Change password</p>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (8+ characters)"
          required
          minLength={8}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
        />
        <button disabled={savingPassword} className="border border-border rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60">
          {savingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
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

const STATUS_BADGE: Record<AppUser['status'], string> = {
  PENDING: 'text-status-maintenance bg-status-maintenance/10',
  ACTIVE: 'text-status-good bg-status-good/10',
  DISABLED: 'text-status-scrap bg-status-scrap/10',
};

function UsersTab() {
  const toast = useToast();
  const [items, setItems] = useState<AppUser[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [error, setError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    api.get('/users').then((res) => setItems(res.data));
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastInviteLink(null);
    if (!fullName || !email) {
      setError('Full name and email are required.');
      return;
    }
    try {
      // No password set here — the invitee sets their own via the link
      // this returns. Nothing gets emailed automatically yet, so that
      // link has to be copied and shared manually for now.
      const res = await api.post('/users/invite', { fullName, email, role });
      setFullName('');
      setEmail('');
      setRole('EMPLOYEE');
      setLastInviteLink(res.data.inviteLink);
      toast.success('Invite created — copy the link below to share it');
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not create invite.');
    }
  }

  function copyLink() {
    if (!lastInviteLink) return;
    navigator.clipboard.writeText(lastInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="text-xs text-muted mb-4">
        Inviting someone here creates their login for the whole system — assets, help desk, and
        payroll all share one account. They set their own password using the link you share with
        them; nothing is emailed automatically yet.
      </p>
      <form onSubmit={add} className="space-y-3 mb-2">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'EMPLOYEE')}
            className="rounded-md border border-border px-3 py-2 text-sm bg-surface"
          >
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-md text-sm">
            <Plus className="w-4 h-4" /> Send invite
          </button>
        </div>
      </form>
      {error && <p className="text-sm text-status-repair mb-2">{error}</p>}
      {lastInviteLink && (
        <div className="flex items-center gap-2 bg-bg border border-border rounded-md px-3 py-2 mb-4 text-sm">
          <span className="flex-1 truncate text-muted">{lastInviteLink}</span>
          <button onClick={copyLink} className="flex items-center gap-1 text-accent shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <ul className="divide-y divide-border">
        {items.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {u.fullName} <span className="text-muted">({u.email})</span>
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[u.status]}`}>
              {u.status === 'PENDING' ? 'Invite pending' : u.status === 'ACTIVE' ? 'Active' : 'Disabled'}
            </span>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted py-2">No one invited yet.</p>}
      </ul>
    </div>
  );
}
