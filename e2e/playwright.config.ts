import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests against the running docker compose stack (`docker compose up -d --build`).
 * Uses the locally installed Google Chrome by default; set PW_CHANNEL=chromium after
 * `npx playwright install chromium` to use Playwright's bundled browser instead.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8088',
    channel: process.env.PW_CHANNEL ?? 'chrome',
    locale: 'fa-IR',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
