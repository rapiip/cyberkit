import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const port = Number(process.env.PLAYWRIGHT_PORT || 3101);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  // Locally the suite runs against `next dev`, which compiles routes on demand.
  // Parallel workers make several first-hit compilations race, so a default 5s
  // expectation can expire on a cold route even though the page is fine. One
  // worker plus a longer expectation keeps local runs trustworthy; CI builds
  // first and serves a warm production output, so it can parallelise.
  workers: isCI ? undefined : 1,
  expect: { timeout: isCI ? 5_000 : 15_000 },
  // CI runners are noisier than a workstation, so allow one retry there only.
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // CI exercises the production output; locally `next dev` gives faster reloads.
    command: isCI
      ? `npm run start -- --hostname 127.0.0.1 --port ${port}`
      : `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
