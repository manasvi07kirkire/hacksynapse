import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:3917", headless: true, channel: process.platform === "win32" ? "msedge" : "chromium", screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3917", url: "http://127.0.0.1:3917/api/health", reuseExistingServer: false, timeout: 60000, env: { SEARCHOPS_API_KEY: "browser-test-only-operator-key-32-characters", DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused", DIRECT_URL: "postgresql://unused:unused@127.0.0.1:1/unused" } },
});
