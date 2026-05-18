import { formatFreshness, formatValue } from '@lib/format';
import type { SignalState } from '@lib/types';

interface Props {
  label: string;
  signal: SignalState | undefined;
  /** ISO time the grade was computed; used to age-stamp the signal. */
  computedAt: string;
}

export default function SignalRow({ label, signal, computedAt }: Props) {
  if (!signal || signal.status === 'missing') {
    return (
      <li className="flex items-center justify-between py-1 text-sm text-slate-500">
        <span>{label}</span>
        <span>no fresh data</span>
      </li>
    );
  }
  const stale = signal.status === 'stale';
  return (
    <li className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className={stale ? 'text-slate-500' : 'text-slate-900'}>
        {formatValue(signal.value, signal.units)}
        <span className="ml-2 text-slate-500">
          ({formatFreshness(signal.observed_at ?? computedAt, new Date(computedAt))})
        </span>
      </span>
    </li>
  );
}
