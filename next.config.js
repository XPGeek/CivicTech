/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export only for production builds. In dev, leave it off so the
  // dynamic /site/[id] route renders via the live dev server.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: { unoptimized: true },
  trailingSlash: false,
  // Some once-ui modules ship as ESM source; let Next compile them.
  transpilePackages: ['@once-ui-system/core'],
  env: {
    NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'local',
    NEXT_PUBLIC_R2_BASE_URL: process.env.NEXT_PUBLIC_R2_BASE_URL ?? '',
    NEXT_PUBLIC_MAP_STYLE: process.env.NEXT_PUBLIC_MAP_STYLE ?? 'osm-raster',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
    NEXT_PUBLIC_MAPBOX_STYLE: process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? 'outdoors-v12',
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev',
  },
};

module.exports = nextConfig;
