import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /zz-iod-opd\.local\.spec\.ts/,
  grep: /opd menu/,
  workers: 1,
  reporter: "list",
  timeout: 400_000,
  use: { baseURL: "http://app.localhost:3000", channel: "chrome", viewport: { width: 1440, height: 900 } },
});
