'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ScanLine, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Asset, STATUS_LABELS, STATUS_COLORS } from '@/lib/types';
import QrScanner from './QrScanner';

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'type' | 'scan'>('type');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeAndReset = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setMode('type');
    setScanError(null);
  }, []);

  // Keyboard shortcut + external trigger (the sidebar search icon dispatches this
  // same event, so both entry points share one implementation).
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') closeAndReset();
    }
    function handleExternalOpen() {
      setOpen(true);
    }
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('open-global-search', handleExternalOpen);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('open-global-search', handleExternalOpen);
    };
  }, [closeAndReset]);

  useEffect(() => {
    if (open && mode === 'type') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== 'type') return;
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get('/assets', { params: { search: query } })
        .then((res) => setResults(res.data.slice(0, 8)))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, mode]);

  function goToAsset(id: string) {
    closeAndReset();
    router.push(`/assets/${id}`);
  }

  const handleScan = useCallback(async (code: string) => {
    try {
      const res = await api.get(`/assets/code/${code}`);
      setOpen(false);
      setQuery('');
      setResults([]);
      setMode('type');
      router.push(`/assets/${res.data.id}`);
    } catch {
      setScanError('No asset matches that code — try again.');
      setTimeout(() => setScanError(null), 2500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[95] flex items-start justify-center pt-24 px-4"
      onClick={closeAndReset}
    >
      <div
        className="bg-surface rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {mode === 'type' ? (
            <>
              <Search className="w-4 h-4 text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, code, serial number, or category…"
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </>
          ) : (
            <>
              <ScanLine className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="flex-1 text-sm text-muted">Point the camera at a QR label</span>
            </>
          )}
          <button
            onClick={() => setMode((m) => (m === 'type' ? 'scan' : 'type'))}
            className="text-xs text-accent hover:underline flex-shrink-0"
          >
            {mode === 'type' ? 'Scan QR instead' : 'Type instead'}
          </button>
          <button onClick={closeAndReset} className="text-muted hover:text-text flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === 'scan' ? (
          <div className="p-4">
            <QrScanner onScan={handleScan} />
            {scanError && <p className="text-sm text-status-repair text-center mt-2">{scanError}</p>}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6 text-muted text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && query && results.length === 0 && (
              <p className="text-sm text-muted text-center py-6">No matching assets.</p>
            )}
            {!loading &&
              results.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => goToAsset(asset.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg transition border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">{asset.name}</p>
                    <p className="font-mono text-xs text-muted">{asset.assetCode}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[asset.status]}`}
                  >
                    {STATUS_LABELS[asset.status]}
                  </span>
                </button>
              ))}
            {!loading && !query && (
              <p className="text-xs text-muted text-center py-6">
                Start typing, or press{' '}
                <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Esc</kbd> to close.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
