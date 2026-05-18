'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { GRADE_COLORS, GRADE_LABELS, GRADE_ORDINAL } from '@lib/grade-style';
import { fetchHistory } from '@lib/client-data';
import type { Grade, HistoryPoint } from '@lib/types';

interface Props {
  siteId: string;
}

interface ChartDatum {
  ts: number;
  label: string;
  grade: Grade;
  value: number;
  reason: string;
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

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!points) return [];
    return points.map((p) => {
      const ts = Date.parse(p.computed_at);
      return {
        ts,
        label: new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        grade: p.grade,
        value: GRADE_ORDINAL[p.grade],
        reason: p.reason,
      };
    });
  }, [points]);

  if (!points) {
    return (
      <div className="h-16 bg-slate-100 rounded animate-pulse" aria-label="Loading history…" />
    );
  }
  if (points.length === 0) {
    return <p className="text-xs text-slate-500">No history yet — first build was just now.</p>;
  }
  if (points.length === 1) {
    // Single point looks weird in a bar chart; show a static pill instead.
    const [only] = points;
    if (!only) return null;
    return (
      <div className="text-xs text-slate-700 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-3 h-3 rounded-sm"
          style={{ backgroundColor: GRADE_COLORS[only.grade] }}
        />
        <span>{GRADE_LABELS[only.grade]} as of {new Date(only.computed_at).toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="h-16 w-full" aria-label="30-day grade history">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }}
            contentStyle={{
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              fontSize: 12,
              padding: '6px 8px',
            }}
            formatter={(_value, _name, item) => {
              const datum = item?.payload as ChartDatum | undefined;
              if (!datum) return ['', ''];
              return [datum.reason, `${GRADE_LABELS[datum.grade]} · ${datum.label}`];
            }}
            labelFormatter={() => ''}
            isAnimationActive={false}
          />
          <Bar dataKey="value" isAnimationActive={false}>
            {chartData.map((d) => (
              <Cell key={d.ts} fill={GRADE_COLORS[d.grade]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
