'use client';

import { useEffect, useState } from 'react';
import { GRADE_COLORS } from '@lib/grade-style';
import { fetchHistory } from '@lib/client-data';
import type { HistoryPoint } from '@lib/types';

interface Props {
  siteId: string;
}

export default function Sparkline({ siteId }: Props) {
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchHistory(siteId).then((data) => {
      if (active) setPoints(data);
    });
    return () => {
      active = false;
    };
  }, [siteId]);

  if (!points) {
    return (
      <div className="h-12 bg-slate-100 rounded animate-pulse" aria-label="Loading history…" />
    );
  }
  if (points.length === 0) {
    return <p className="text-xs text-slate-500">No history yet — the first build was just now.</p>;
  }

  // Render a row of small colored bars, oldest left → newest right.
  return (
    <div className="flex items-end gap-0.5 h-10" aria-label="30-day grade history">
      {points.map((p, i) => (
        <span
          key={`${p.computed_at}-${i}`}
          title={`${new Date(p.computed_at).toLocaleDateString()} — ${p.reason}`}
          className="flex-1 min-w-[3px] rounded-sm"
          style={{
            backgroundColor: GRADE_COLORS[p.grade],
            height: '100%',
          }}
        />
      ))}
    </div>
  );
}
