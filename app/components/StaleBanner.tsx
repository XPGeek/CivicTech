'use client';

import { useEffect, useState } from 'react';
import { formatFreshness } from '@lib/format';
import type { Manifest } from '@lib/types';

interface Props {
  manifest: Manifest | null;
}

const STALE_AFTER_HOURS = 6;

export default function StaleBanner({ manifest }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Avoid hydration mismatch: only compute "now" after mount.
  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!manifest || !now || dismissed) return null;
  const ageHours = (now.getTime() - Date.parse(manifest.built_at)) / 3600_000;
  if (ageHours < STALE_AFTER_HOURS) return null;

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-300 text-amber-900 text-sm px-4 py-2 flex items-center gap-2"
    >
      <span className="flex-1">
        Data may be delayed — last successful refresh: {formatFreshness(manifest.built_at, now)}.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-900 underline"
      >
        Dismiss
      </button>
    </div>
  );
}
