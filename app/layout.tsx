import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import {
  ThemeInit,
  DataThemeProvider,
  LayoutProvider,
  IconProvider,
  ToastProvider,
} from '@once-ui-system/core';

import '@once-ui-system/core/css/styles.css';
import '@once-ui-system/core/css/tokens.css';
import './globals.css';

import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';

const themeConfig = {
  theme: 'system',
  brand: 'cyan',
  accent: 'emerald',
  neutral: 'slate',
  solid: 'contrast',
  'solid-style': 'flat',
  border: 'rounded',
  surface: 'translucent',
  transition: 'all',
  scaling: '100',
  'viz-style': 'chart',
} as const;

export const metadata: Metadata = {
  title: {
    default: 'DMV Water Watch — is it safe to get in the water today?',
    template: '%s · DMV Water Watch',
  },
  description:
    "Real-time water-quality grades for the DMV's paddling, rowing, and swimming spots. Bacteria, rainfall, and live sondes — unified.",
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
      "Real-time water-quality grades for the DMV's paddling, rowing, and swimming spots.",
    type: 'website',
    siteName: 'DMV Water Watch',
  },
  twitter: {
    card: 'summary',
    title: 'DMV Water Watch',
    description:
      "Real-time water-quality grades for the DMV's paddling, rowing, and swimming spots.",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <ThemeInit config={themeConfig} />
      </head>
      <body>
        <DataThemeProvider>
          <LayoutProvider>
            <IconProvider>
              <ToastProvider>{children}</ToastProvider>
            </IconProvider>
          </LayoutProvider>
        </DataThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
