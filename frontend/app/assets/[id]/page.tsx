'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, Upload, Wrench, Trash2, Pencil, ArrowLeftRight } from 'lucide-react';
import { api } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import {
  Asset,
  Category,
  Location,
  Department,
  STATUS_LABELS,
  STATUS_COLORS,
  AssetStatus,
  Movement,
  AppUser,
} from '@/lib/types';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace('/api', '');

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(`/assets/${id}`);
    setAsset(res.data);
  }, [id]);

  useEffect(() => {
    load();
    api.get('/categories').then((res) => setCategories(res.data));
    api.get('/locations').then((res) => setLocations(res.data));
    api.get('/departments').then((res) => setDepartments(res.data));
  }, [load]);

  if (!asset) {
    return (
      <main className="min-h-screen bg-bg pl-20">
        <AppHeader />
        <div className="max-w-5xl mx-auto px-6 py-8 text-muted text-sm">Loading…</div>
      </main>
    );
  }

  async function updateStatus(status: AssetStatus) {
    await api.patch(`/assets/${id}`, { status });
    load();
  }

  async function deleteAsset() {
    if (!confirm(`Delete "${asset?.name}"? This cannot be undone.`)) return;
    await api.delete(`/assets/${id}`);
    router.push('/assets');
  }

  return (
    <main className="min-h-screen bg-bg pl-20">
      <AppHeader />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/assets" className="text-sm text-muted hover:text-text">
              ← Back to Assets
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="font-display font-bold text-2xl text-primary">{asset.name}</h1>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[asset.status]}`}>
                {STATUS_LABELS[asset.status]}
              </span>
            </div>
            <p className="font-mono text-xs text-muted mt-1">{asset.assetCode}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing((e) => !e)}
              className="flex items-center gap-1.5 bg-surface border border-border px-3 py-2 rounded-md text-sm hover:border-accent transition"
            >
              <Pencil className="w-4 h-4" /> {editing ? 'Cancel Edit' : 'Edit'}
            </button>
            <button
              onClick={deleteAsset}
              className="flex items-center gap-1.5 bg-surface border border-border text-status-repair px-3 py-2 rounded-md text-sm hover:border-status-repair transition"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: info + QR */}
          <div className="lg:col-span-1 space-y-6">
            {editing ? (
              <EditAssetForm
                asset={asset}
                categories={categories}
                locations={locations}
                departments={departments}
                onSaved={() => {
                  setEditing(false);
                  load();
                }}
              />
            ) : (
              <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
                <h2 className="font-display font-medium text-primary mb-1">Details</h2>
                <InfoRow label="Category" value={asset.category?.name} />
                <InfoRow label="Location" value={asset.location?.room} />
                <InfoRow label="Department" value={asset.department?.name} />
                {asset.assetType === 'ELECTRONIC' && (
                  <>
                    <InfoRow label="Brand" value={asset.brand} />
                    <InfoRow label="Serial Number" value={asset.serialNumber} />
                    {asset.specifications &&
                      Object.entries(asset.specifications).map(([k, v]) => (
                        <InfoRow key={k} label={k.toUpperCase()} value={v} />
                      ))}
                  </>
                )}
                <InfoRow label="Purchase Date" value={formatDate(asset.purchaseDate)} />
                <InfoRow
                  label="Purchase Cost"
                  value={asset.purchaseCost != null ? `$${Number(asset.purchaseCost).toFixed(2)}` : undefined}
                />
                <InfoRow label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} />

                <div className="border-t border-border pt-3">
                  <label className="text-xs text-muted uppercase tracking-wide">Change status</label>
                  <select
                    value={asset.status}
                    onChange={(e) => updateStatus(e.target.value as AssetStatus)}
                    className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm bg-surface"
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {asset.qrImageUrl && (
              <div className="bg-surface border border-border rounded-lg p-5 text-center">
                <h2 className="font-display font-medium text-primary mb-3">QR Label</h2>
                <img
                  src={`${API_ORIGIN}${asset.qrImageUrl}`}
                  alt={`QR code for ${asset.assetCode}`}
                  className="w-40 h-40 mx-auto"
                />
                <p className="font-mono text-xs text-muted mt-2">{asset.assetCode}</p>
                <Link
                  href={`/assets/print?ids=${asset.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <Printer className="w-4 h-4" /> Print this label
                </Link>
              </div>
            )}
          </div>

          {/* Right column: movements + attachments + maintenance */}
          <div className="lg:col-span-2 space-y-6">
            <MovementsSection asset={asset} locations={locations} onChange={load} />
            <AttachmentsSection assetId={asset.id} attachments={asset.attachments ?? []} onChange={load} />
            <MaintenanceSection
              assetId={asset.id}
              schedules={asset.maintenanceSchedules ?? []}
              logs={asset.maintenanceLogs ?? []}
              onChange={load}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-text font-medium">{value ?? '—'}</span>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return undefined;
  return new Date(value).toLocaleDateString();
}

function EditAssetForm({
  asset,
  categories,
  locations,
  departments,
  onSaved,
}: {
  asset: Asset;
  categories: Category[];
  locations: Location[];
  departments: Department[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: asset.name,
    categoryId: asset.categoryId,
    locationId: asset.locationId ?? '',
    departmentId: asset.departmentId ?? '',
    brand: asset.brand ?? '',
    serialNumber: asset.serialNumber ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/assets/${asset.id}`, {
        name: form.name,
        categoryId: form.categoryId,
        locationId: form.locationId || undefined,
        departmentId: form.departmentId || undefined,
        brand: form.brand || undefined,
        serialNumber: form.serialNumber || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <h2 className="font-display font-medium text-primary mb-1">Edit Details</h2>
      <div>
        <label className="block text-xs text-muted mb-1">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Category</label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Location</label>
        <select
          value={form.locationId}
          onChange={(e) => setForm({ ...form, locationId: e.target.value })}
          className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
        >
          <option value="">None</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.room}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Department</label>
        <select
          value={form.departmentId}
          onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
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
      {asset.assetType === 'ELECTRONIC' && (
        <>
          <div>
            <label className="block text-xs text-muted mb-1">Brand</label>
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Serial Number</label>
            <input
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
        </>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-primary text-white font-medium rounded-md py-2 text-sm hover:opacity-90 transition disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

function AttachmentsSection({
  assetId,
  attachments,
  onChange,
}: {
  assetId: string;
  attachments: Asset['attachments'];
  onChange: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'PHOTO' | 'INVOICE' | 'OTHER'>('PHOTO');
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetId', assetId);
    formData.append('fileType', fileType);
    try {
      await api.post('/attachments', formData);
      setFile(null);
      onChange();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    await api.delete(`/attachments/${attachmentId}`);
    onChange();
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h2 className="font-display font-medium text-primary mb-3">Attachments</h2>
      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-muted mb-1">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as any)}
            className="rounded-md border border-border px-3 py-2 text-sm bg-surface"
          >
            <option value="PHOTO">Photo</option>
            <option value="INVOICE">Invoice</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={!file || uploading}
          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {attachments && attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm border-t border-border pt-2">
              <a
                href={`${API_ORIGIN}${a.fileUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {a.fileType} — {a.fileUrl.split('/').pop()}
              </a>
              <button onClick={() => handleDelete(a.id)} className="text-muted hover:text-status-repair">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No attachments yet.</p>
      )}
    </div>
  );
}

function MaintenanceSection({
  assetId,
  schedules,
  logs,
  onChange,
}: {
  assetId: string;
  schedules: Asset['maintenanceSchedules'];
  logs: Asset['maintenanceLogs'];
  onChange: () => void;
}) {
  const activeSchedule = schedules?.find((s) => s.isActive);
  const [interval, setInterval_] = useState('3');
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    serviceDate: new Date().toISOString().slice(0, 10),
    vendorName: '',
    technicianName: '',
    partsReplaced: '',
    cost: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function setSchedule() {
    setSaving(true);
    try {
      await api.post('/maintenance/schedules', { assetId, intervalMonths: Number(interval) });
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/maintenance/logs', {
        assetId,
        scheduleId: activeSchedule?.id,
        serviceDate: logForm.serviceDate,
        vendorName: logForm.vendorName || undefined,
        technicianName: logForm.technicianName || undefined,
        partsReplaced: logForm.partsReplaced || undefined,
        cost: logForm.cost ? Number(logForm.cost) : undefined,
        notes: logForm.notes || undefined,
      });
      setShowLogForm(false);
      onChange();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h2 className="font-display font-medium text-primary mb-3">Maintenance</h2>

      {activeSchedule ? (
        <div className="flex items-center justify-between bg-bg rounded-md p-3 mb-4">
          <div className="text-sm">
            <p>
              Every <strong>{activeSchedule.intervalMonths}</strong> month
              {activeSchedule.intervalMonths > 1 ? 's' : ''}
            </p>
            <p className="text-muted">
              Next due: {new Date(activeSchedule.nextDueDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setShowLogForm((s) => !s)}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition"
          >
            <Wrench className="w-4 h-4" /> Log Service
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-muted mb-1">Interval (months)</label>
            <input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval_(e.target.value)}
              className="w-24 rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={setSchedule}
            disabled={saving}
            className="bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            Set Schedule
          </button>
        </div>
      )}

      {showLogForm && (
        <form onSubmit={submitLog} className="border border-border rounded-md p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Service Date</label>
              <input
                type="date"
                value={logForm.serviceDate}
                onChange={(e) => setLogForm({ ...logForm, serviceDate: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Cost</label>
              <input
                type="number"
                value={logForm.cost}
                onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Vendor</label>
              <input
                value={logForm.vendorName}
                onChange={(e) => setLogForm({ ...logForm, vendorName: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Technician</label>
              <input
                value={logForm.technicianName}
                onChange={(e) => setLogForm({ ...logForm, technicianName: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Parts Replaced</label>
            <input
              value={logForm.partsReplaced}
              onChange={(e) => setLogForm({ ...logForm, partsReplaced: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Notes</label>
            <textarea
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Service Log'}
          </button>
        </form>
      )}

      <h3 className="text-sm font-medium text-primary mb-2">Service History</h3>
      {logs && logs.length > 0 ? (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="text-sm border-t border-border pt-2">
              <div className="flex justify-between">
                <span className="font-medium">{new Date(log.serviceDate).toLocaleDateString()}</span>
                {log.cost != null && <span className="text-muted">${Number(log.cost).toFixed(2)}</span>}
              </div>
              <p className="text-muted">
                {[log.vendorName, log.technicianName].filter(Boolean).join(' · ') || '—'}
              </p>
              {log.notes && <p className="text-muted mt-1">{log.notes}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No service history yet.</p>
      )}
    </div>
  );
}

function MovementsSection({
  asset,
  locations,
  onChange,
}: {
  asset: Asset;
  locations: Location[];
  onChange: () => void;
}) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [action, setAction] = useState<'CHECKOUT' | 'TRANSFER' | null>(null);
  const [targetId, setTargetId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data));
    api.get('/movements', { params: { assetId: asset.id } }).then((res) => setHistory(res.data));
  }, [asset.id]);

  async function runMovement(movementType: string, extra: Record<string, string | undefined> = {}) {
    setSaving(true);
    try {
      await api.post('/movements', { assetId: asset.id, movementType, notes: notes || undefined, ...extra });
      setNotes('');
      setAction(null);
      setTargetId('');
      onChange();
      api.get('/movements', { params: { assetId: asset.id } }).then((res) => setHistory(res.data));
    } finally {
      setSaving(false);
    }
  }

  async function checkIn() {
    await runMovement('CHECKIN');
  }

  async function dispose() {
    if (!confirm('Mark this asset as disposed / written off? This cannot be undone from here.')) return;
    await runMovement('OUTBOUND');
  }

  async function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) return;
    if (action === 'CHECKOUT') await runMovement('CHECKOUT', { toUserId: targetId });
    if (action === 'TRANSFER') await runMovement('TRANSFER', { toLocationId: targetId });
  }

  const isCheckedOut = !!asset.currentHolderId;

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h2 className="font-display font-medium text-primary mb-3">Movement & Circulation</h2>

      <div className="flex items-center justify-between bg-bg rounded-md p-3 mb-4">
        <div className="text-sm">
          <p className="text-muted">Current Holder</p>
          <p className="font-medium">
            {isCheckedOut ? users.find((u) => u.id === asset.currentHolderId)?.name ?? 'Assigned' : 'Unassigned (in storage)'}
          </p>
        </div>
        <div className="flex gap-2">
          {isCheckedOut ? (
            <button
              onClick={checkIn}
              disabled={saving}
              className="bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              Check In
            </button>
          ) : (
            <button
              onClick={() => setAction(action === 'CHECKOUT' ? null : 'CHECKOUT')}
              className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition"
            >
              <ArrowLeftRight className="w-4 h-4" /> Check Out
            </button>
          )}
          <button
            onClick={() => setAction(action === 'TRANSFER' ? null : 'TRANSFER')}
            className="bg-surface border border-border px-3 py-2 rounded-md text-sm hover:border-accent transition"
          >
            Transfer
          </button>
          {asset.status !== 'DISPOSED' && (
            <button
              onClick={dispose}
              className="bg-surface border border-border text-status-repair px-3 py-2 rounded-md text-sm hover:border-status-repair transition"
            >
              Dispose
            </button>
          )}
        </div>
      </div>

      {action && (
        <form onSubmit={submitAction} className="border border-border rounded-md p-4 mb-4 space-y-3">
          {action === 'CHECKOUT' ? (
            <div>
              <label className="block text-xs text-muted mb-1">Assign to</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
              >
                <option value="">Select person</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-muted mb-1">New location</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface"
              >
                <option value="">Select location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.room}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-muted mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !targetId}
            className="bg-primary text-white px-3 py-2 rounded-md text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </form>
      )}

      {history.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-primary mb-2">History</h3>
          <ul className="space-y-2">
            {history.slice(0, 5).map((m) => (
              <li key={m.id} className="text-sm border-t border-border pt-2 flex justify-between">
                <span>{m.movementType}</span>
                <span className="text-muted">{new Date(m.movementDate).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
