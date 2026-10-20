import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 760 },
    screenshot: "only-on-failure",
    launchOptions: { args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--js-flags=--expose-gc"] },
  },
  // XBROWSER=1 adds Firefox and WebKit projects that run the smoke test (browsers installed with
  // PLAYWRIGHT_BROWSERS_PATH set, e.g. on D:). The default run is the Edge project only.
  projects: [
    // Uses the installed Microsoft Edge (Chromium) by default; set PW_CHANNEL="" to use Playwright's bundled Chromium.
    { name: "edge", use: { channel: process.env.PW_CHANNEL ?? "msedge" } },
    ...(process.env.XBROWSER
      ? [
          { name: "firefox", testMatch: /smoke\.spec\.ts/, use: { browserName: "firefox" as const, launchOptions: { args: [] } } },
          { name: "webkit", testMatch: /smoke\.spec\.ts/, use: { browserName: "webkit" as const, launchOptions: { args: [] } } },
        ]
      : []),
  ],
  webServer: {
    command: "npx vite --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
