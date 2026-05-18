import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'DMV Water Watch — Is it safe to get in the water today?',
  description:
    'Mobile-first water-quality report card for paddlers, rowers, and swimmers across DC, Arlington, Alexandria, PG, and Montgomery.',
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
      "Real-time water-quality grades for the region's recreation sites. Bacteria, rainfall, sondes — unified.",
    type: 'website',
    siteName: 'DMV Water Watch',
  },
  twitter: {
    card: 'summary',
    title: 'DMV Water Watch',
    description:
      "Real-time water-quality grades for the region's recreation sites.",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
