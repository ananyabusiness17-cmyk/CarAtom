import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/admin',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
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
