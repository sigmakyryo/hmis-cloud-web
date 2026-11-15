import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./tests/e2e", testMatch: /zz-tmp-oh-home\.local\.spec\.ts/, workers: 1, reporter: "list", timeout: 90000, use: { baseURL: "http://app.localhost:3000", channel: "chrome", viewport: { width: 1440, height: 900 } } });
