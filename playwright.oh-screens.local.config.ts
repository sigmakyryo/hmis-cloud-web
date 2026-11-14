import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /zz-oh-screens\.local\.spec\.ts/,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  use: { baseURL: "http://localhost:3123", channel: "chrome", viewport: { width: 1440, height: 900 } },
});
