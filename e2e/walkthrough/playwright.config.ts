import { defineConfig, devices } from '@playwright/test';

const API_BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
const ADMIN_BASE = process.env.E2E_ADMIN_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  projects: [
    {
      name: 'api',
      testIgnore: /admin-web-ops/,
      use: { baseURL: API_BASE, extraHTTPHeaders: {} },
    },
    {
      name: 'admin-web',
      testMatch: /admin-web-ops/,
      use: { ...devices['Desktop Chrome'], baseURL: ADMIN_BASE },
    },
  ],
  webServer: {
    command: 'pnpm --filter @caratom/admin dev --port 3000',
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:8000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
      NEXT_PUBLIC_ENV: 'development',
    },
  },
});
