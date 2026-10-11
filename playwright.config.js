// Automatic browser checks. See README.md, "Checks".
// Run with `npm test` (builds _site/ first). Chromium only, at phone and desktop size.
import { defineConfig, devices } from "@playwright/test";

const PORT = 8090;

export default defineConfig({
  testDir: "tests",
  outputDir: "test-results",
  fullyParallel: true,
  workers: 4, // pages are heavy (full-page screenshots, axe); more workers make them time out
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalTeardown: "./tests/global-teardown.mjs",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  // Serves the already-built _site/ (the `test` script builds first).
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
