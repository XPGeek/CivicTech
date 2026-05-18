'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dmv-water-watch.disclaimer-acked';

export default function DisclaimerInterstitial() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-heading"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3"
    >
      <div className="bg-white rounded-t-xl sm:rounded-xl max-w-md w-full p-5 shadow-xl">
        <h2 id="disclaimer-heading" className="text-lg font-semibold text-slate-900">
          Before you use this app
        </h2>
        <p className="mt-2 text-sm text-slate-700 leading-relaxed">
          DMV Water Watch shows water-quality grades aggregated from federal and local sources.
          These grades are <strong>informational, not a safety guarantee</strong>. Conditions can
          change between samples — observe posted signage and use your own judgment. Swimming is
          prohibited in DC waters.
        </p>
        <button
          type="button"
          onClick={close}
          className="mt-4 w-full min-h-[44px] rounded bg-slate-900 text-white font-medium"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
