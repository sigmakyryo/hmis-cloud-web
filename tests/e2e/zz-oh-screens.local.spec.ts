import { test, type Page } from "@playwright/test";
import { MOCK_USER, mockAuthenticatedSession, setAuthCookies } from "./helpers/auth-mocks";

const USER = { ...MOCK_USER, name: "Dr Thandi Banda", email: "thandi.banda@example.test", is_admin: true, groups: ["Registration", "Clinical", "OccupationalHealth", "Admin"], enabled_modules: ["OccupationalHealth", "Forms", "Clinical", "Registration"] };

const OUT = "/Users/test/Documents/hmis-bundle/screens";
const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

const clinical = [
  { uuid: "f1", name: "Pre-employment medical", family: "occupational_health", system_type: "examination", placement: null, group: { uuid: "g1", name: "Pre-employment", sort_order: 0 }, sort_order: 0, template_kind: "exam", template_uuid: "x1", active: true, published_version_number: 3 },
  { uuid: "f2", name: "Audiometry screening", family: "occupational_health", system_type: "examination", placement: null, group: { uuid: "g1", name: "Pre-employment", sort_order: 0 }, sort_order: 1, template_kind: "exam", template_uuid: "x2", active: true, published_version_number: 1 },
  { uuid: "f3", name: "Spirometry", family: "occupational_health", system_type: "examination", placement: null, group: { uuid: "g2", name: "Periodic surveillance", sort_order: 1 }, sort_order: 0, template_kind: "exam", template_uuid: "x3", active: true, published_version_number: null },
  { uuid: "f4", name: "Driver certificate of fitness", family: "occupational_health", system_type: "certificate", placement: null, group: { uuid: "g3", name: "Certificates", sort_order: 2 }, sort_order: 0, template_kind: "certificate", template_uuid: "c1", active: true, published_version_number: 2 },
  { uuid: "f5", name: "Working at heights COF", family: "occupational_health", system_type: "certificate", placement: null, group: { uuid: "g3", name: "Certificates", sort_order: 2 }, sort_order: 1, template_kind: "certificate", template_uuid: "c2", active: true, published_version_number: 1 },
  { uuid: "f6", name: "Legacy hearing form 2019", family: "occupational_health", system_type: "examination", placement: null, group: null, sort_order: 0, template_kind: "exam", template_uuid: "x9", active: false, published_version_number: 4 },
  { uuid: "f7", name: "Old night-shift questionnaire", family: "occupational_health", system_type: "employee_form", placement: null, group: null, sort_order: 0, template_kind: "employee", template_uuid: "e9", active: false, published_version_number: 2 },
];
const employeeTemplates = [
  { uuid: "e1", name: "Health declaration (employee)", active: true, published_version_number: 2 },
  { uuid: "e2", name: "Women's health questionnaire", active: true, published_version_number: null },
  { uuid: "e9", name: "Old night-shift questionnaire", active: false, published_version_number: 2 },
];
const groups = [
  { uuid: "g1", name: "Pre-employment", sort_order: 0, forms_count: 2 },
  { uuid: "g2", name: "Periodic surveillance", sort_order: 1, forms_count: 1 },
  { uuid: "g3", name: "Certificates", sort_order: 2, forms_count: 2 },
];

export async function baseMocks(page: Page, extra: (path: string, url: URL) => unknown | undefined = () => undefined) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.startsWith("/api/auth/")) return route.fallback();
    const custom = extra(path, url);
    if (custom !== undefined) return route.fulfill(json(custom));
    if (path.endsWith("/clinical-forms")) return route.fulfill(json(clinical));
    if (path.includes("employee-form-templates")) return route.fulfill(json({ results: employeeTemplates, count: employeeTemplates.length }));
    if (path.includes("exam-templates") || path.includes("cof-templates")) return route.fulfill(json({ results: [], count: 0 }));
    if (path.endsWith("/form-groups")) return route.fulfill(json(groups));
    console.log("UNMOCKED", route.request().method(), path + url.search);
    return route.fulfill(json([]));
  });
  await mockAuthenticatedSession(page);
  await page.route("**/api/auth/session", (route) => route.fulfill(json({ authenticated: true, user: USER })));
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ user: USER })));
}

async function open(page: Page, path: string) {
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
  page.on("response", (r) => { if (r.url().includes("/api/") && !r.url().includes("/api/auth")) console.log("RESP", r.status(), new URL(r.url()).pathname); });
  await page.goto("/");
  await setAuthCookies(page);
  await page.goto(path);
}

test("forms grouping board", async ({ page }) => {
  await baseMocks(page);
  await open(page, "/occupational-health/forms?layout=groups");
  await page.getByTestId("oh-form-groups-board").waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/01-forms-grouping-board.png`, fullPage: true });
});

test("forms archived filter", async ({ page }) => {
  await baseMocks(page);
  await open(page, "/occupational-health/forms?view=archived");
  await page.getByTestId("oh-forms-list").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-forms-archived-filter.png`, fullPage: true });
  await open(page, "/occupational-health/forms");
  await page.getByTestId("oh-forms-list").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03b-forms-live-list-grouped.png`, fullPage: true });
});

const now = "2026-11-14T09:30:00+02:00";
function enc(n: number, first: string, last: string, type: { code: string; name: string }, extra: Record<string, unknown> = {}) {
  return { origin: "laravel", id: n, uuid: `9d6fdb12-94f6-5eec-a027-${String(n).padStart(12, "0")}`, visit: `3a8e6291-5524-512d-9358-${String(n).padStart(12, "0")}`,
    department: "oh", department_name: "Occupational Health", department_type: "occupational_health", location: null, location_name: "Main clinic",
    clinician: null, clinician_name: "Dr T. Banda", customer_uuid: `c-${n}`, first_name: first, last_name: last, customer_name: `${first} ${last}`,
    gender: "male", employer_name: "Lilongwe Cement Ltd", status: "waiting", billing_mode: "employer", visit_date: "2026-11-14",
    visit_type: { uuid: `vt-${type.code}`, code: type.code, name: type.name, forms: [] }, iod_case: null,
    started_at: now, ended_at: null, notes: "", is_active: true, created_at: now, updated_at: now, ...extra };
}
const IOD_CASE = "5f1c2a40-7c1e-5b8e-9d11-0a1b2c3d4e5f";
const encounters = [
  enc(1, "Chikondi", "Phiri", { code: "injury_on_duty", name: "Injury on Duty" }, { iod_case: { uuid: IOD_CASE, status: "open" }, notes: "Injury on Duty" }),
  enc(2, "Grace", "Mwale", { code: "pre_employment", name: "Pre-employment" }, { gender: "female" }),
  enc(3, "Kondwani", "Banda", { code: "periodic", name: "Periodic medical" }),
];
const iodCases = [
  { id: 1, uuid: IOD_CASE, customer: 101, employment_episode: 7, encounter: 1, she_reference: "", severity: "", lost_days: 0, status: "open", onset_date: "2026-11-14", mechanism: "", body_part: "", incident_location: "", safety_classification: "", work_related: true, description: "", created_at: now, updated_at: now, customer_name: "Chikondi Phiri" },
  { id: 2, uuid: "iod-2", customer: 102, employment_episode: 8, encounter: null, she_reference: "SHE-2026-031", severity: "moderate", lost_days: 3, status: "closed", onset_date: "2026-10-02", mechanism: "Slip / trip", body_part: "Left ankle", incident_location: "Kiln floor", safety_classification: "LTI", work_related: true, description: "", created_at: now, updated_at: now, customer_name: "Mphatso Zulu" },
];
const queueMocks = (path: string) => {
  if (path.endsWith("/occupational-health/encounters")) return { results: encounters, count: encounters.length };
  if (path.endsWith("/occupational-health/iod-cases")) return { results: iodCases, count: iodCases.length };
  if (path.endsWith(`/iod-cases/${IOD_CASE}`)) return iodCases[0];
  return undefined;
};

test("oh queue iod routing and injuries list", async ({ page }) => {
  await baseMocks(page, queueMocks);
  await open(page, "/occupational-health");
  await page.getByTestId("oh-queue-iod-badge").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-oh-queue-iod-row.png`, fullPage: true });
  const href = await page.locator(`a[href*="/records/iod/${IOD_CASE}"]`).first().getAttribute("href");
  console.log("IOD HREF", href);
  await page.goto("/occupational-health/injuries");
  await page.getByText("Chikondi Phiri").first().waitFor({ timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/05-injuries-open-case.png`, fullPage: true });
  await page.goto(`/occupational-health/records/iod/${IOD_CASE}`);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/06-iod-case-screen.png`, fullPage: true });
});

test("explore builder", async ({ page }) => {
  await baseMocks(page);
  await open(page, "/templates/employee/e2");
  await page.waitForTimeout(8000);
  console.log("BUILDER URL", page.url());
});
