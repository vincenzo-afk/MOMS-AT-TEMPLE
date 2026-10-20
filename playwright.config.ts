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
    // Uses the installed Microsoft Edge (Chromium) by default; set PW_CHANNEL="" to use Playwright's bundled Chromium.
    channel: process.env.PW_CHANNEL ?? "msedge",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "npx vite --port 5173 --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
