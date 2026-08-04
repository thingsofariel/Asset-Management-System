'use client';

import { useEffect, useRef } from 'react';

export default function QrScanner({ onScan }: { onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let scanner: any;
    let cancelled = false;

    // Dynamically imported: html5-qrcode touches the DOM/camera APIs, which
    // don't exist during Next.js's server-side render pass.
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      scanner = new Html5QrcodeScanner(
        'qr-reader-region',
        { fps: 10, qrbox: 250 },
        false,
      );
      scanner.render(
        (decodedText: string) => onScanRef.current(decodedText),
        () => {
          // Fires continuously while no code is in view — expected, ignore.
        },
      );
    });

    return () => {
      cancelled = true;
      if (scanner) scanner.clear().catch(() => {});
    };
  }, []);

  return <div id="qr-reader-region" className="w-full" />;
}
