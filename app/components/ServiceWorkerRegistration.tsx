'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      window.location.hostname === 'localhost'
    ) {
      return;
    }
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore; the app works without the SW
    });
  }, []);
  return null;
}
