'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headset, Paperclip, Loader2 } from 'lucide-react';
import {
  getCategories,
  createRequest,
  HelpdeskCategory,
  PRIORITY_OPTIONS,
  Priority,
  MAX_DESCRIPTION_LENGTH,
  MAX_UPLOAD_MB,
  ACCEPTED_FILE_TYPES,
} from '@/lib/helpdesk';

// Public — no login required, same as the original. This is the one
// page in the whole app deliberately reachable by someone with no
// account at all (a vendor, a visitor, anyone submitting an IT issue).
export default function SubmitRequestPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<HelpdeskCategory[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ publicCode: string; hubLink: string } | null>(null);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !phone || !description) {
      setError('Name, email, phone, and description are required.');
      return;
    }
    if (!categoryId && !customCategoryText) {
      setError('Pick a category, or describe your own if none fit.');
      return;
    }
    if (file && file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`Attachment must be under ${MAX_UPLOAD_MB}MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    if (categoryId) formData.append('categoryId', categoryId);
    if (customCategoryText) formData.append('customCategoryText', customCategoryText);
    formData.append('description', description);
    if (priority) formData.append('priority', priority);
    if (file) formData.append('attachment', file);

    setSubmitting(true);
    try {
      const res = await createRequest(formData);
      setResult({ publicCode: res.publicCode, hubLink: res.hubLink });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-request-accepted/10 text-request-accepted flex items-center justify-center mx-auto mb-4">
            <Headset className="w-6 h-6" strokeWidth={2} />
          </div>
          <h1 className="font-display font-bold text-xl text-primary mb-2">Request submitted</h1>
          <p className="text-sm text-muted mb-4">
            Your Request ID is <strong className="text-text">{result.publicCode}</strong> — save this to check on
            its status later.
          </p>
          <button
            onClick={() => router.push(`/help/track/${result.publicCode}`)}
            className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium"
          >
            View request status
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full bg-surface border border-border rounded-xl p-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Headset className="w-5 h-5" strokeWidth={2} />
        </div>
        <h1 className="font-display font-bold text-xl text-primary mb-1">Submit an IT request</h1>
        <p className="text-sm text-muted mb-6">Describe the issue and we'll get back to you.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="rounded-md border border-border px-3 py-2 text-sm bg-bg"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="rounded-md border border-border px-3 py-2 text-sm bg-bg"
            />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
          />

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              if (e.target.value) setCustomCategoryText('');
            }}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
          >
            <option value="">Select a category…</option>
            {categories
              .filter((c) => c.parentId === null)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {!categoryId && (
            <input
              value={customCategoryText}
              onChange={(e) => setCustomCategoryText(e.target.value)}
              placeholder="Or describe the type of issue, if none fit above"
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
            />
          )}

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="Describe the issue"
              rows={4}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg resize-none"
            />
            <p className="text-xs text-muted text-right mt-1">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm bg-bg"
          >
            <option value="">Priority (optional — we'll set one based on category)</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-muted border border-dashed border-border rounded-md px-3 py-2.5 cursor-pointer">
            <Paperclip className="w-4 h-4 shrink-0" />
            <span className="truncate">{file ? file.name : `Attach a file (optional, up to ${MAX_UPLOAD_MB}MB)`}</span>
            <input
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          {error && <p className="text-sm text-status-repair">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>

          <p className="text-center text-xs text-muted">
            Already submitted one?{' '}
            <a href="/help/track" className="text-accent hover:underline">
              Track its status
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
