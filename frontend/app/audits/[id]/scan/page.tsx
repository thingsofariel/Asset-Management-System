'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import QrScanner from '@/components/QrScanner';

interface ScanResult {
  ok: boolean;
  message: string;
  matchStatus?: string;
}

export default function AuditScanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scannedCount, setScannedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const lastScan = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  useEffect(() => {
    api.get(`/audits/${id}`).then((res) => {
      setTotalCount(res.data.items?.length ?? 0);
      setScannedCount(res.data.items?.filter((i: any) => i.scannedAt).length ?? 0);
    });
  }, [id]);

  const handleScan = useCallback(
    async (assetCode: string) => {
      const now = Date.now();
      // Ignore repeat scans of the same code within 3 seconds — the camera
      // keeps firing while the code stays in frame.
      if (assetCode === lastScan.current.code && now - lastScan.current.time < 3000) return;
      lastScan.current = { code: assetCode, time: now };

      try {
        const res = await api.post(`/audits/${id}/scan`, { assetCode });
        setResult({
          ok: true,
          message: `${res.data.asset.name} — ${res.data.matchStatus === 'MISMATCH' ? 'wrong location' : 'confirmed'}`,
          matchStatus: res.data.matchStatus,
        });
        setScannedCount((c) => c + 1);
      } catch (err: any) {
        setResult({ ok: false, message: err?.response?.data?.message ?? 'Unrecognized QR code' });
      }
      setTimeout(() => setResult(null), 2500);
    },
    [id],
  );

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm text-white/60">Scanning</p>
          <p className="font-medium">
            {scannedCount}
            {totalCount != null ? ` / ${totalCount}` : ''} items
          </p>
        </div>
        <button
          onClick={() => router.push(`/audits/${id}`)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <QrScanner onScan={handleScan} />
        </div>
      </div>

      {result && (
        <div
          className={`mx-4 mb-6 rounded-lg p-4 flex items-center gap-3 ${
            !result.ok
              ? 'bg-status-repair/20 text-white'
              : result.matchStatus === 'MISMATCH'
                ? 'bg-status-maintenance/20 text-white'
                : 'bg-status-good/20 text-white'
          }`}
        >
          {result.ok ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      <p className="text-center text-xs text-white/40 pb-4">
        Point the camera at an asset's QR label
      </p>
    </main>
  );
}
