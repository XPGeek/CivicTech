'use client';

import { useEffect } from 'react';
import { captureError } from '@lib/sentry';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          padding: '2rem',
          background: '#f8fafc',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: 28 * 16,
            margin: '0 auto',
            background: 'white',
            padding: '1.25rem',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
          }}
        >
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: '0.5rem', color: '#334155', fontSize: '0.875rem' }}>
            The page failed to load. Refresh to try again.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 4,
              background: '#0f172a',
              color: 'white',
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Go to map
          </a>
        </div>
      </body>
    </html>
  );
}
