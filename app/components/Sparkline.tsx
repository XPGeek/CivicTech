'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Row, Text } from '@once-ui-system/core/components';
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

const SKELETON_STYLE: React.CSSProperties = {
  height: 64,
  width: '100%',
  borderRadius: 'var(--r-sm)',
  background: 'var(--neutral-alpha-weak, rgba(15, 23, 42, 0.06))',
  animation: 'pulse 1.4s ease-in-out infinite',
};

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
    return <div aria-label="Loading history" style={SKELETON_STYLE} />;
  }

  if (points.length === 0) {
    return (
      <Text variant="body-default-xs" onBackground="neutral-weak">
        No history yet — first build was just now.
      </Text>
    );
  }

  if (points.length === 1) {
    // Single point looks weird in a bar chart; show a static pill instead.
    const [only] = points;
    if (!only) return null;
    return (
      <Row gap="8" vertical="center">
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 'var(--r-xs)',
            backgroundColor: GRADE_COLORS[only.grade],
          }}
        />
        <Text variant="body-default-xs" onBackground="neutral-medium">
          {GRADE_LABELS[only.grade]} as of {new Date(only.computed_at).toLocaleString()}
        </Text>
      </Row>
    );
  }

  return (
    <div style={{ height: 64, width: '100%' }} aria-label="30-day grade history">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" hide />
          <Tooltip
            cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: 'var(--shadow-md)',
              fontSize: 12,
              padding: '8px 10px',
            }}
            formatter={(_value, _name, item) => {
              const datum = item?.payload as ChartDatum | undefined;
              if (!datum) return ['', ''];
              return [datum.reason, `${GRADE_LABELS[datum.grade]} · ${datum.label}`];
            }}
            labelFormatter={() => ''}
            isAnimationActive={false}
          />
          <Bar dataKey="value" isAnimationActive={false} radius={[3, 3, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.ts} fill={GRADE_COLORS[d.grade]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
