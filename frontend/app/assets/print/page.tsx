'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { api } from '@/lib/api';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace('/api', '');

interface LabelAsset {
  id: string;
  assetCode: string;
  name: string;
  qrImageUrl: string | null;
}

export default function PrintLabelsPage() {
  return (
    <Suspense fallback={null}>
      <PrintLabelsContent />
    </Suspense>
  );
}

function PrintLabelsContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids') ?? '';
  const [assets, setAssets] = useState<LabelAsset[]>([]);

  useEffect(() => {
    if (!ids) return;
    api.get('/assets/labels', { params: { ids } }).then((res) => setAssets(res.data));
  }, [ids]);

  return (
    <main className="min-h-screen bg-bg p-8">
      <div className="print:hidden flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <h1 className="font-display font-bold text-xl text-primary">
          Print Labels ({assets.length})
        </h1>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-md text-sm hover:opacity-90 transition"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto print:grid-cols-3 print:gap-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="border border-border rounded-md p-3 text-center bg-white break-inside-avoid"
          >
            {asset.qrImageUrl && (
              <img
                src={`${API_ORIGIN}${asset.qrImageUrl}`}
                alt={`QR code for ${asset.assetCode}`}
                className="w-28 h-28 mx-auto"
              />
            )}
            <p className="text-xs font-medium mt-1 truncate">{asset.name}</p>
            <p className="font-mono text-[10px] text-muted">{asset.assetCode}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
