/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use static export only for production builds. In dev, leave it off so
  // dynamic routes (/site/[id]) render via the live dev server.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  images: { unoptimized: true },
  trailingSlash: false,
  // Once UI ships a barrel index; let Next rewrite barrel imports to direct
  // module paths at build time so unused components don't pull into the bundle.
  experimental: {
    optimizePackageImports: ['@once-ui-system/core'],
  },
  env: {
    NEXT_PUBLIC_DATA_SOURCE: process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'local',
    NEXT_PUBLIC_R2_BASE_URL: process.env.NEXT_PUBLIC_R2_BASE_URL ?? '',
    NEXT_PUBLIC_MAP_STYLE: process.env.NEXT_PUBLIC_MAP_STYLE ?? 'osm-raster',
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '',
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev',
  },
};

module.exports = nextConfig;
