'use client';

import { useEffect } from 'react';
import { captureError } from '@lib/sentry';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div role="alert" className="max-w-md w-full bg-white rounded-lg shadow p-5">
        <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-700">
          The map ran into an unexpected error. The data is fine — this is a frontend hiccup. Refresh, or click below to retry.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-3 py-2 min-h-[44px] rounded bg-slate-900 text-white text-sm font-medium"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-3 py-2 min-h-[44px] rounded border border-slate-300 text-slate-700 text-sm font-medium no-underline"
          >
            Go to map
          </a>
        </div>
        {error.digest && (
          <p className="mt-3 text-xs text-slate-500">
            Error ref: <code>{error.digest}</code>
          </p>
        )}
      </div>
    </main>
  );
}
