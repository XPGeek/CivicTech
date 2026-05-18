import type { Metadata, Viewport } from 'next';
import {
  Background,
  Column,
  IconProvider,
  LayoutProvider,
  ThemeProvider,
  ToastProvider,
} from '@once-ui-system/core';
import '@once-ui-system/core/css/styles.css';
import '@once-ui-system/core/css/tokens.css';
import './globals.css';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: {
    default: 'DMV Water Watch — Is the river safe today?',
    template: '%s — DMV Water Watch',
  },
  description:
    'Five-second water-quality verdicts for every paddle, row, and swim launch across DC, Arlington, Alexandria, PG, and Montgomery.',
  manifest: '/manifest.webmanifest',
  applicationName: 'DMV Water Watch',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DMV Water Watch',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    other: [{ rel: 'mask-icon', url: '/icon.svg', color: '#0f172a' }],
  },
  openGraph: {
    title: 'DMV Water Watch',
    description:
      'Real-time water-quality grades for the region\'s recreation sites. Bacteria, rainfall, sondes — unified.',
    type: 'website',
    siteName: 'DMV Water Watch',
  },
  twitter: {
    card: 'summary',
    title: 'DMV Water Watch',
    description: 'Real-time water-quality grades for the region\'s recreation sites.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          theme="system"
          neutral="slate"
          brand="cyan"
          accent="emerald"
          solid="contrast"
          solidStyle="flat"
          border="rounded"
          surface="translucent"
          transition="all"
          scaling="100"
        >
          <IconProvider>
            <LayoutProvider>
              <ToastProvider>
                <Background fillWidth style={{ minHeight: '100dvh' }}>
                  <Column fillWidth style={{ minHeight: '100dvh' }}>
                    {children}
                  </Column>
                </Background>
                <ServiceWorkerRegistration />
              </ToastProvider>
            </LayoutProvider>
          </IconProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
