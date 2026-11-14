import { test, type Page } from "@playwright/test";
import { MOCK_USER, mockAuthenticatedSession, setAuthCookies } from "./helpers/auth-mocks";

const OUT = process.env.SHOTS_DIR ?? "/tmp";
const VISIT = "89da0222-94d8-4c78-b321-b8c29e8034d3";
const ENC = "4f65e580-4466-460d-aa83-c2f5bf2f8c86";
const CUST = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const CASE = "7125b443-fb1b-422b-be62-d00d46257546";
const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
const USER = { ...MOCK_USER, name: "Dr Thandi Banda", email: "t@example.test", is_admin: false, user_role: "physician", groups: ["Clinical"], enabled_modules: ["OccupationalHealth", "Clinical", "Registration"] };

const encounter = { id: 1, uuid: ENC, visit: VISIT, department: "dep", department_name: "Outpatient", department_type: "opd", location: null, location_name: null, clinician: 1, clinician_name: "Dr Banda", status: "in_progress", billing_mode: "shared_visit", started_at: "2026-11-12T08:30:00Z", ended_at: null, notes: "", is_active: true, created_by: 1, created_at: "2026-11-12T08:30:00Z", updated_at: "2026-11-12T08:30:00Z" };
const visit = { id: 1, uuid: VISIT, customer: CUST, customer_name: "Chikondi Phiri", customer_identifier: "CL-0042", visit_date: "2026-11-12T08:30:00Z", status: "active", mode_of_payment: "cash", encounters: [encounter], is_active: true, clinic_name: "Main clinic" };
const customer = { id: 9, uuid: CUST, tenant: 1, first_name: "Chikondi", middle_name: null, last_name: "Phiri", full_name: "Chikondi Phiri", customer_identifier: "CL-0042", gender: "male", dob: "1990-03-02", is_active: true, visit_status: "active" };
const iodCase = { id: 1, uuid: CASE, customer: 9, customer_uuid: CUST, severity: "moderate", lost_days: 0, status: "open", onset_date: "2026-11-12", incident_time: null, mechanism: "Crush", body_part: "Right hand", incident_location: "", reported_by: "", safety_classification: "medical_treatment", work_related: true, description: "The worker caught the right hand between the die and the press bed while clearing a jam, causing a crush injury.", witnesses: "", immediate_action: "", treatment_given: "Wound irrigated and dressed, X-ray requested.", root_cause: "", source_visit_uuid: VISIT, source_encounter_uuid: ENC, ai_status: "documented", ai_documented_at: "2026-11-14T10:00:00Z", ai_drafted_fields: ["description", "mechanism", "body_part", "safety_classification", "severity", "treatment_given"], created_at: "2026-11-12T09:00:00Z", updated_at: "2026-11-14T10:00:00Z" };

async function setup(page: Page, user = USER) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/auth/")) return route.fallback();
    if (path === `/api/visits/${VISIT}`) return route.fulfill(json(visit));
    if (path === `/api/customers/${CUST}`) return route.fulfill(json(customer));
    if (path.endsWith(`/opd-iod/by-encounter/${ENC}`)) return route.fulfill(json(null));
    if (path.endsWith("/my-capabilities")) return route.fulfill(json({ capabilities: ["record_chief_complaint"] }));
    if (path.endsWith(`/iod-cases/${CASE}`)) return route.fulfill(json(iodCase));
    if (path.endsWith("/statutory-pack")) return route.fulfill(json({ notice: "", employee: { full_name: "Chikondi Phiri", identifier: "CL-0042", date_of_birth: null, gender: "male", employee_number: "", job_title: "Press operator", department: "", site: "", employment_start_date: null, employment_type: "" }, employer: { name: "Lilongwe Cement Ltd", registration_number: "" }, medical: { first_treatment_date: null, treatment_given: "", lost_days: 0, fitness_outcome: null, restrictions: [], certificate_valid_to: null }, classification: { lost_time_injury: false, fatal: false }, notifications: [], generated_at: "" }));
    if (path.endsWith("/entries")) return route.fulfill(json([{ uuid: "e1", kind: "event", event_code: "opened", body: "Case opened", owner_name: "", due_date: null, completed_on: null, author_name: "Dr Banda", created_at: "2026-11-12T09:00:00Z" }, { uuid: "e2", kind: "event", event_code: "ai_documented", body: "AI drafted description, mechanism, body part from the visit record. Please review.", owner_name: "", due_date: null, completed_on: null, author_name: "AI assistant", created_at: "2026-11-14T10:00:00Z" }]));
    return route.fulfill(json([]));
  });
  await mockAuthenticatedSession(page);
  await page.route("**/api/auth/session", (route) => route.fulfill(json({ authenticated: true, user })));
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ user })));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 260)); });
  await page.goto("/");
  await setAuthCookies(page);
}

test("opd menu and dialog", async ({ page }) => {
  await setup(page);
  await page.goto(`/clinical/opd/${VISIT}/${ENC}/activity`, { waitUntil: "commit", timeout: 350000 });
  await page.getByTestId("opd-encounter-more-menu").waitFor({ timeout: 350000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/01-opd-header.png`, clip: { x: 240, y: 90, width: 1200, height: 200 } });
  await page.getByTestId("opd-encounter-more-menu").click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-opd-menu-open.png`, clip: { x: 240, y: 90, width: 1200, height: 300 } });
  await page.getByRole("menuitem", { name: "Record injury on duty" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-record-dialog.png` });
});

test("iod case with ai notice", async ({ page }) => {
  await setup(page, { ...USER, groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"] });
  await page.goto(`/occupational-health/records/iod/${CASE}`);
  await page.getByTestId("oh-iod-ai-notice").waitFor({ timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/04-iod-ai-notice.png` });
  await page.getByRole("button", { name: "More actions" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-iod-menu.png`, clip: { x: 700, y: 90, width: 740, height: 420 } });
});
