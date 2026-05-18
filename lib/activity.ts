'use client';

import { useEffect, useState } from 'react';
import type { Activity } from './types';

const STORAGE_KEY = 'dmv-water-watch.activity';

export function useActivity(): readonly [Activity, (a: Activity) => void] {
  const [activity, setActivity] = useState<Activity>('paddle');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'paddle' || stored === 'swim') setActivity(stored);
    } catch {
      // ignore — Safari private mode etc.
    }
  }, []);

  const update = (a: Activity) => {
    setActivity(a);
    try {
      window.localStorage.setItem(STORAGE_KEY, a);
    } catch {
      // ignore
    }
  };

  return [activity, update] as const;
}
