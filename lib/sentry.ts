'use client';

/**
 * Sentry wrapper. Activates only when NEXT_PUBLIC_SENTRY_DSN is set; falls
 * back to console.error otherwise so local dev doesn't depend on a token.
 *
 * Kept lazy + minimal: a full @sentry/nextjs install hooks server + client +
 * edge with many tracing knobs. For the MVP we just need browser-side
 * error capture; the rest can come in a follow-up.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

let initialized = false;
let sentry: typeof import('@sentry/browser') | null = null;

async function ensureInit(): Promise<void> {
  if (initialized || !DSN || typeof window === 'undefined') return;
  initialized = true;
  try {
    const mod = await import('@sentry/browser');
    mod.init({
      dsn: DSN,
      tracesSampleRate: 0,
      environment: process.env.NODE_ENV ?? 'production',
      release: process.env.NEXT_PUBLIC_BUILD_ID || undefined,
    });
    sentry = mod;
  } catch (err) {
    // Sentry failed to load — degrade silently. The error boundary still works.
    // eslint-disable-next-line no-console
    console.error('Sentry init failed', err);
  }
}

export function captureError(err: unknown): void {
  if (!DSN) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
    return;
  }
  void ensureInit().then(() => {
    if (sentry) sentry.captureException(err);
  });
}
