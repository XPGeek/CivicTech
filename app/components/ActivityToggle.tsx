'use client';

import type { Activity } from '@lib/types';

interface Props {
  activity: Activity;
  onChange: (a: Activity) => void;
  /** True if the user has selected a DC-only site (swim option suppressed). */
  swimAllowed: boolean;
}

export default function ActivityToggle({ activity, onChange, swimAllowed }: Props) {
  return (
    <div
      role="group"
      aria-label="Activity"
      className="inline-flex rounded-full bg-white border border-slate-200 shadow-sm overflow-hidden text-sm"
    >
      <button
        type="button"
        aria-pressed={activity === 'paddle'}
        onClick={() => onChange('paddle')}
        className={`px-3 py-1.5 min-h-[44px] ${
          activity === 'paddle' ? 'bg-slate-900 text-white' : 'text-slate-700'
        }`}
      >
        🚣 Paddle
      </button>
      <button
        type="button"
        aria-pressed={activity === 'swim'}
        aria-disabled={!swimAllowed}
        title={swimAllowed ? '' : 'Swimming is prohibited at this site'}
        onClick={() => swimAllowed && onChange('swim')}
        className={`px-3 py-1.5 min-h-[44px] ${
          activity === 'swim'
            ? 'bg-slate-900 text-white'
            : swimAllowed
              ? 'text-slate-700'
              : 'text-slate-400'
        }`}
      >
        🏊 Swim
      </button>
    </div>
  );
}
