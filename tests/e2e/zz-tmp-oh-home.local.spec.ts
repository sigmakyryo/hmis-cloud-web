import { test } from "@playwright/test";
import { MOCK_USER, mockAuthenticatedSession, setAuthCookies } from "./helpers/auth-mocks";

const USER = { ...MOCK_USER, name: "Dr Thandi Banda", is_admin: true, groups: ["OccupationalHealth", "Admin"], enabled_modules: ["OccupationalHealth"] };
const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const now = Date.now();
const enc = (i: number, name: string, employer: string, dept: string, status: string, mins: number) => ({ uuid: "e" + i, visit: "v" + i, customer_name: name, customer_uuid: "c" + i, employer_name: employer, department_name: dept, status, started_at: new Date(now - mins * 60000).toISOString(), created_at: new Date(now - mins * 60000).toISOString() });
const encounters = [enc(1, "Owen Onions", "Illovo Sugar", "Mill", "waiting", 42), enc(2, "Grace Phiri", "Press Cane", "Boiler house", "in_progress", 18), enc(3, "Chikondi Banda", "Illovo Sugar", "Workshop", "waiting", 9), enc(4, "Tadala Mwale", "Sunbird", "Kitchen", "waiting", 3)];

test("oh home", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/auth/")) return route.fallback();
    if (path.includes("compliance")) return route.fulfill(json({ due: 14, overdue: 6, completed: 212, waived: 3, open_episodes: 240, due_within_30_days: 31, fitness_validity_alerts: 2 }));
    if (path.includes("exposure/dashboard")) return route.fulfill(json({ kpis: { open_events: 3, open_critical: 1 } }));
    if (path.includes("encounters")) return route.fulfill(json({ results: encounters, count: encounters.length }));
    console.log("UNMOCKED", path);
    return route.fulfill(json([]));
  });
  await mockAuthenticatedSession(page);
  await page.route("**/api/auth/session", (route) => route.fulfill(json({ authenticated: true, user: USER })));
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ user: USER })));
  await page.goto("/");
  await setAuthCookies(page);
  await page.goto("/occupational-health/home");
  await page.getByTestId("oh-home").waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/private/tmp/claude-501/-Users-test--claude-spares-spare-JYiSu0/1859e104-8524-4f8e-beef-43e8ab25c859/scratchpad/shots/home-clinic.png" });
  await page.getByTestId("oh-home-search").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/private/tmp/claude-501/-Users-test--claude-spares-spare-JYiSu0/1859e104-8524-4f8e-beef-43e8ab25c859/scratchpad/shots/home-jump-empty.png" });
  await page.getByTestId("oh-home-search").fill("due");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/private/tmp/claude-501/-Users-test--claude-spares-spare-JYiSu0/1859e104-8524-4f8e-beef-43e8ab25c859/scratchpad/shots/home-jump-due.png" });
  await page.keyboard.press("Escape");
  await page.getByTestId("oh-home-module-drug-alcohol").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/private/tmp/claude-501/-Users-test--claude-spares-spare-JYiSu0/1859e104-8524-4f8e-beef-43e8ab25c859/scratchpad/shots/home-da.png" });
});
