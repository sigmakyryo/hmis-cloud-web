import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DaWellbeingPage } from "@/app/(app)/drug-alcohol/_components/wellbeing/DaWellbeingPage";
import { BffError } from "@/lib/bff-client";
import { wellbeingProxy } from "@/lib/server/wellbeing-bff";

const mocks = vi.hoisted(() => ({
  cases: vi.fn(),
  caseDetail: vi.fn(),
  providers: vi.fn(),
  open: vi.fn(),
  discipline: vi.fn(),
  report: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/drug-alcohol/wellbeing",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/wellbeing.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/occupational-health/services/wellbeing.service")>();
  return {
    ...actual,
    fetchWbCases: (...args: unknown[]) => mocks.cases(...args),
    fetchWbCase: (...args: unknown[]) => mocks.caseDetail(...args),
    fetchWbProviders: (...args: unknown[]) => mocks.providers(...args),
    openWbCase: (...args: unknown[]) => mocks.open(...args),
    fetchWbDiscipline: (...args: unknown[]) => mocks.discipline(...args),
    fetchWbReport: (...args: unknown[]) => mocks.report(...args),
  };
});

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";
const STATUS_CASE = {
  uuid: "case-1111-2222",
  customer_uuid: UUID,
  customer_initials: "S.W.",
  status: "engaged",
  in_support: true,
  opened_at: "2026-11-01T08:00:00+02:00",
  closed_at: null,
  return_to_duty: { uuid: "rtd-1", status: "follow_up", followups_done: 2, followups_required: 6 },
  detail: false,
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cases.mockResolvedValue({ results: [STATUS_CASE], can_manage: false });
  mocks.caseDetail.mockResolvedValue(STATUS_CASE);
  mocks.providers.mockResolvedValue([]);
  mocks.discipline.mockResolvedValue([]);
});

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("wellbeing BFF allowlist", () => {
  it("allows case, provider, discipline and report paths only", () => {
    expect(wellbeingProxy.resolve("GET", ["cases", UUID])?.path).toBe(`/oh-wb/cases/${UUID}`);
    expect(wellbeingProxy.resolve("POST", ["cases", UUID, "sessions"])).not.toBeNull();
    expect(wellbeingProxy.resolve("POST", ["cases", UUID, "delete"])).toBeNull();
    expect(wellbeingProxy.resolve("PATCH", ["providers", UUID])).not.toBeNull();
    expect(wellbeingProxy.resolve("PATCH", ["cases", UUID])).toBeNull();
    expect(wellbeingProxy.resolve("GET", ["discipline"])).not.toBeNull();
    expect(wellbeingProxy.query(new Request("http://x/api?status=active&note=secret"))).toBe("?status=active");
  });
});

it("lists support cases with return-to-duty progress and shows status only when not allowed detail", async () => {
  renderPage(<DaWellbeingPage />);
  expect(screen.getByTestId("oh-da-wellbeing-page")).toBeVisible();
  await waitFor(() => expect(screen.getByText("S.W.")).toBeVisible());
  expect(screen.getByText("follow up · follow-up 2/6")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  await waitFor(() => expect(screen.getByTestId("oh-wb-status-only")).toBeVisible());
  expect(screen.queryByText("Consent and referral")).toBeNull();
});

it("shows the full case to the wellbeing team", async () => {
  mocks.caseDetail.mockResolvedValue({
    ...STATUS_CASE,
    detail: true,
    origin: "self_referral",
    safe_harbour: true,
    outcome: "ongoing",
    consent: { given: true, scope: "eap", at: "2026-11-01T08:00:00+02:00", withdrawn_at: null },
    provider: null,
    referred_at: null,
    sessions: [],
    attendance: { attended: 0, missed: 0 },
    plan: {},
  });
  renderPage(<DaWellbeingPage />);
  await waitFor(() => expect(screen.getByText("S.W.")).toBeVisible());
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  await waitFor(() => expect(screen.getByText("Consent and referral")).toBeVisible());
  expect(screen.getByText("Asked for help")).toBeVisible();
  expect(screen.getByText("Yes, no disciplinary action for this disclosure")).toBeVisible();
});

it("opens a self-referral with safe harbour", async () => {
  mocks.open.mockResolvedValue({ ...STATUS_CASE, uuid: "case-new" });
  renderPage(<DaWellbeingPage />);
  fireEvent.click(screen.getByRole("button", { name: "Someone asked for help" }));
  fireEvent.change(within(screen.getByTestId("oh-wb-new-case")).getAllByRole("textbox")[0], { target: { value: UUID } });
  fireEvent.click(screen.getByRole("button", { name: "Open case" }));
  await waitFor(() =>
    expect(mocks.open).toHaveBeenCalledWith({ customer_uuid: UUID, customer_initials: undefined, origin: "self_referral", safe_harbour: true }),
  );
});

it("disciplinary tab explains when the user may not see it", async () => {
  mocks.discipline.mockRejectedValue(new BffError("Forbidden", 403));
  renderPage(<DaWellbeingPage />);
  fireEvent.click(screen.getByRole("button", { name: "Disciplinary" }));
  await waitFor(() => expect(screen.getByText("Only the employer representative or an administrator can see disciplinary outcomes.")).toBeVisible());
});

it("reports hide small groups", async () => {
  mocks.report.mockResolvedValue({
    from: "2025-11-10",
    to: "2026-11-10",
    k_threshold: 5,
    totals: { cases: null, open: null, engaged: null, engagement_rate: null, median_days_to_first_session: null, safe_harbour: null },
    by_origin: [],
    by_outcome: [],
    discipline: [],
  });
  renderPage(<DaWellbeingPage />);
  fireEvent.click(screen.getByRole("button", { name: "Reports" }));
  await waitFor(() => expect(screen.getByTestId("oh-wb-report")).toBeVisible());
  expect(screen.getAllByText("fewer than 5").length).toBeGreaterThan(0);
});
