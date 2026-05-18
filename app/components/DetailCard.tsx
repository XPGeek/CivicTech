'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type {
  Activity,
  GradeOutput,
  SitePinProperties,
  SourceSummary,
} from '@lib/types';
import GradeHero from './GradeHero';
import SignalRow from './SignalRow';
import Sparkline from './Sparkline';

interface Props {
  site: SitePinProperties;
  grade: GradeOutput;
  activity: Activity;
  sources: SourceSummary[];
  /** If true, render the standalone-page header (h1 + jurisdiction line). */
  standalone?: boolean;
}

export default function DetailCard({ site, grade, activity, sources, standalone }: Props) {
  const [copied, setCopied] = useState(false);

  const onShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/site/${site.id}`;
    const shareData = { title: site.name, text: grade.reason, url };
    try {
      const nav = navigator as unknown as {
        share?: (data: { title: string; text: string; url: string }) => Promise<void>;
        clipboard?: { writeText: (s: string) => Promise<void> };
      };
      if (typeof nav.share === 'function') {
        await nav.share(shareData);
      } else if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user dismissed share sheet — non-error
    }
  }, [site.id, site.name, grade.reason]);

  // Per UX § 4 — which sources contributed to this grade?
  const contributingSourceIds = sourcesFromSignals(grade);
  const contributingSources = sources.filter((s) => contributingSourceIds.has(s.id));

  const HeadingTag = standalone ? 'h1' : 'h2';
  const headingClass = standalone
    ? 'text-2xl font-bold text-slate-900'
    : 'text-lg font-semibold text-slate-900 leading-tight';
  const subnameClass = standalone ? 'text-sm text-slate-500' : 'text-xs text-slate-500';

  return (
    <article className="px-4 pb-6" aria-labelledby={`site-${site.id}-name`}>
      <header className={standalone ? 'pt-4' : 'pt-3'}>
        <HeadingTag id={`site-${site.id}-name`} className={headingClass}>
          {site.name}
        </HeadingTag>
        {site.subname && <p className={subnameClass}>{site.subname}</p>}
      </header>


      <GradeHero grade={grade.grade} activity={activity} reason={grade.reason} />

      <p className="text-xs text-slate-500 my-2">
        Conditions can change between samples. Use your own judgment.
      </p>

      <section aria-label="Signal breakdown">
        <h3 className="text-sm font-medium text-slate-700 mt-3 mb-1">Signals</h3>
        <ul className="divide-y divide-slate-100">
          <SignalRow label="Bacteria" signal={grade.signals.bacteria} computedAt={grade.computed_at} />
          <SignalRow label="Rainfall (48h)" signal={grade.signals.rainfall} computedAt={grade.computed_at} />
          <SignalRow label="Real-time sonde" signal={grade.signals.sonde} computedAt={grade.computed_at} />
          {grade.signals.chronic && (
            <SignalRow
              label="EPA impairment"
              signal={grade.signals.chronic}
              computedAt={grade.computed_at}
            />
          )}
        </ul>
      </section>

      <section aria-label="30-day history" className="mt-4">
        <h3 className="text-sm font-medium text-slate-700 mb-1">30-day history</h3>
        <Sparkline siteId={site.id} />
      </section>

      <section aria-label="Site details" className="mt-4 text-sm text-slate-700">
        <h3 className="text-sm font-medium text-slate-700 mb-1">Site details</h3>
        <ul className="space-y-1">
          <li>
            <strong>Launch:</strong> {site.launch_type.replace(/-/g, ' ')}
          </li>
          <li>
            <strong>Parking:</strong> {site.parking}
            {site.fee && <span> · launch fee</span>}
          </li>
          <li>
            <strong>Activities:</strong> {site.activity_types.join(', ')}
          </li>
          {site.notes && (
            <li className="text-slate-500">
              <strong>Notes:</strong> {site.notes}
            </li>
          )}
        </ul>
      </section>

      <section aria-label="Sources" className="mt-4 text-xs text-slate-600">
        <strong className="block text-slate-700">Sources</strong>
        {contributingSources.length === 0 ? (
          <p className="text-slate-500">No data sources contributed fresh data to this grade.</p>
        ) : (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {contributingSources.map((s) => (
              <li key={s.id}>
                <span className="text-slate-900">{s.name}</span>
                {s.last_updated && (
                  <span className="text-slate-500">
                    {' '}
                    · updated {new Date(s.last_updated).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-200 text-sm">
        <button
          type="button"
          onClick={onShare}
          className="px-3 py-2 min-h-[44px] rounded bg-slate-900 text-white"
        >
          {copied ? 'Link copied' : 'Share'}
        </button>
        <Link
          href="/methodology"
          className="text-slate-700 no-underline hover:underline"
        >
          How is this grade calculated?
        </Link>
      </footer>
    </article>
  );
}

function sourcesFromSignals(grade: GradeOutput): Set<string> {
  // Per UX § 4 / DATA_SOURCES.md § Source attribution rules: if a source
  // contributed a signal, surface it; if it was stale or missing, still surface
  // the absence rather than silently omitting.
  const ids = new Set<string>();
  if (grade.signals.bacteria) ids.add('anacostia-riverkeeper');
  if (grade.signals.rainfall) ids.add('noaa-precip');
  if (grade.signals.sonde) {
    ids.add('doee-sondes');
    ids.add('usgs-nwis');
  }
  if (grade.signals.chronic) ids.add('epa-hmw');
  return ids;
}
