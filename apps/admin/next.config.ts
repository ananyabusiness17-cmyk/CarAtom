import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(here, '../..'),
  transpilePackages: ['@caratom/api-client', '@caratom/contracts', '@caratom/ui-tokens'],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.caratom.in https://*.supabase.co http://127.0.0.1:8000 http://localhost:8000; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
