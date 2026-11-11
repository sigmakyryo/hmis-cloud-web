import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bffRequest: vi.fn(),
  toast: vi.fn(),
  ohServiceRequest: vi.fn(),
  requireAccessToken: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/occupational-health",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ isLoading: false, userData: { groups: ["OccupationalHealth"], enabled_modules: ["OccupationalHealth"] } }),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/bff-client", () => ({
  bffRequest: (...a: unknown[]) => mocks.bffRequest(...a),
  BffError: class extends Error {},
}));
vi.mock("@/lib/server/oh-service", () => ({
  OH_SERVICE_URL: "http://ohs.test/api",
  ohServiceRequest: (...args: unknown[]) => mocks.ohServiceRequest(...args),
}));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: () => mocks.requireAccessToken() }));
vi.mock("@/lib/server/bff-response", () => ({
  bffSuccess: (data: unknown, status = 200) => Response.json(data, { status }),
  bffError: () => Response.json({ message: "error" }, { status: 500 }),
}));

import { OhVisitCancellationsReport } from "@/features/occupational-health/components/OhVisitCancellationsReport";
import { OhSurveillanceRecallsCard } from "@/features/occupational-health/components/OhSurveillanceRecallsCard";
import { OhRecordDetailPage } from "@/features/occupational-health/pages/OhRecordDetailPage";
import { ohExtProxy } from "@/lib/server/oh-ext-bff";

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccessToken.mockResolvedValue({ accessToken: "session-token" });
});
afterEach(() => cleanup());

describe("oh-ext BFF allowlist", () => {
  it("allows surveillance recall endpoints only", () => {
    expect(ohExtProxy.resolve("GET", ["oh", "surveillance", "recalls"])?.path).toBe("/oh/surveillance/recalls");
    expect(ohExtProxy.resolve("POST", ["oh", "surveillance", "recalls", UUID, "acknowledge"])).not.toBeNull();
    expect(ohExtProxy.resolve("POST", ["oh", "surveillance", "schedule"])).toBeNull();
    expect(ohExtProxy.resolve("GET", ["oh", "surveillance", ".."])).toBeNull();
  });
});

describe("surveillance recalls card", () => {
  it("lists open recalls, sends recalls now and acknowledges", async () => {
    mocks.bffRequest.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path.includes("recalls/run")) return { in_app: 2, queued: 2, sent: 1, skipped: 1, failed: 0 };
      if (path.includes("acknowledge")) return {};
      if (opts?.method) return {};
      return [
        { uuid: UUID, customer_uuid: UUID, requirement_uuid: UUID, component_code: "AUDIO", exam_type: "periodic", stage: "overdue",
          channel: "in_app", status: "sent", to_address: "", subject: "", body: "", due_date: "2026-05-01", attempts: 0,
          sent_at: null, acknowledged_at: null, acknowledged_by: "", last_error: "", created_at: null },
      ];
    });
    renderWithClient(<OhSurveillanceRecallsCard />);
    expect(await screen.findByText(/AUDIO · periodic · due 2026-05-01/)).toBeTruthy();
    fireEvent.click(screen.getByText("Send recalls now"));
    await waitFor(() =>
      expect(mocks.bffRequest).toHaveBeenCalledWith("/api/occupational-health/oh-ext/oh/surveillance/recalls/run", {
        method: "POST",
        body: { within_days: 14, channels: ["email"] },
      }),
    );
    fireEvent.click(screen.getByText("Done"));
    await waitFor(() =>
      expect(mocks.bffRequest).toHaveBeenCalledWith(`/api/occupational-health/oh-ext/oh/surveillance/recalls/${UUID}/acknowledge`, {
        method: "POST",
        body: {},
      }),
    );
  });
});

describe("record detail pages", () => {
  it("edits an IOD case and sends only the changed fields", async () => {
    mocks.bffRequest.mockImplementation(async (_path: string, opts?: { method?: string }) => {
      if (opts?.method === "PATCH") return {};
      return { uuid: UUID, status: "open", severity: "minor", lost_days: 0, onset_date: "2026-05-01", work_related: true, description: "Cut", created_at: "2026-05-01T08:00:00Z" };
    });
    renderWithClient(<OhRecordDetailPage kind="iod" uuid={UUID} />);
    const lost = (await screen.findByLabelText("Lost days")) as HTMLInputElement;
    await waitFor(() => expect(lost.value).toBe("0"));
    fireEvent.change(lost, { target: { value: "4" } });
    fireEvent.click(screen.getByText("Save changes"));
    await waitFor(() =>
      expect(mocks.bffRequest).toHaveBeenCalledWith(`/api/occupational-health/iod-cases/${UUID}`, { method: "PATCH", body: { lost_days: 4 } }),
    );
    expect(screen.getByText("Notification pack PDF").closest("a")?.getAttribute("href")).toBe(
      `/api/occupational-health/oh-ext/iod-cases/${UUID}/statutory-pack/pdf`,
    );
  });

  it("shows a certificate read-only with its PDF link and version history", async () => {
    mocks.bffRequest.mockImplementation(async (path: string) => {
      if (path.endsWith("/history"))
        return {
          versions: [
            { uuid: UUID, version: 2, status: "amended", in_force: true, valid_from: "2026-01-01", valid_to: null, signed_at: null, signed_by: 1,
              outcome: "fit", restrictions: ["No heights"], withdrawn_at: null, withdrawal_reason: null, previous_uuid: null },
          ],
          events: [{ certificate_uuid: UUID, action: "amended", actor_name: "A.B.", summary: "", reason: "Add restriction", occurred_at: null }],
        };
      if (path.endsWith("/verify-link")) return { verify_url: "https://ohs.example/api/oh-cof/verify/x?sig=y" };
      return { uuid: UUID, version: 2, status: "amended", valid_from: "2026-01-01" };
    });
    renderWithClient(<OhRecordDetailPage kind="certificate" uuid={UUID} />);
    expect(await screen.findByText("Restrictions: No heights")).toBeTruthy();
    expect(screen.getByText(/amended by A.B. — Add restriction/)).toBeTruthy();
    expect(screen.getByText("Print / download PDF").closest("a")?.getAttribute("href")).toBe(
      `/api/occupational-health/oh-ext/fitness-certificates/${UUID}/pdf`,
    );
    expect(screen.queryByText("Save changes")).toBeNull();
    expect(ohExtProxy.resolve("GET", ["fitness-certificates", UUID, "pdf"])?.binary?.type).toBe("application/pdf");
  });
});

describe("visit cancellations report", () => {
  it("shows totals by reason and links the CSV through the binary proxy", async () => {
    mocks.bffRequest.mockResolvedValue({
      from: "2026-01-01", to: "2026-03-31", total_visits: 40, cancelled: 3, no_show: 2, no_show_rate: 0.05,
      by_reason: [{ code: "employer_request", label: "Employer asked to cancel", count: 3 }],
      by_month: [{ month: "2026-02", cancelled: 3, no_show: 2 }], by_visit_type: {}, by_employer: {}, rows: [],
    });
    renderWithClient(<OhVisitCancellationsReport />);
    expect(await screen.findByText("Employer asked to cancel: 3")).toBeTruthy();
    expect(screen.getByText(/no-show rate 5.0%/)).toBeTruthy();
    expect(screen.getByText("CSV").closest("a")?.getAttribute("href")).toMatch(
      /^\/api\/occupational-health\/oh-ext\/oh\/reports\/visit-cancellations\/csv\?from=/,
    );
    expect(ohExtProxy.resolve("GET", ["oh", "reports", "visit-cancellations", "csv"])?.binary?.type).toBe("text/csv");
  });
});

describe("sick leave detail", () => {
  it("prints and records a return to work", async () => {
    mocks.bffRequest.mockImplementation(async (_path: string, opts?: { method?: string }) => {
      if (opts?.method === "POST") return {};
      return { uuid: UUID, status: "issued", start_date: "2026-06-01", days: 5, expected_return: "2026-06-06", work_capacity: "unfit_all_work" };
    });
    renderWithClient(<OhRecordDetailPage kind="sick-leave" uuid={UUID} />);
    expect((await screen.findByText("Print / download PDF")).closest("a")?.getAttribute("href")).toBe(
      `/api/occupational-health/oh-ext/oh/sick-leave/${UUID}/pdf`,
    );
    fireEvent.change(screen.getByLabelText("Outcome"), { target: { value: "fit_with_restrictions" } });
    fireEvent.change(screen.getByLabelText("Work restrictions (one per line)"), { target: { value: "No lifting\n" } });
    fireEvent.change(screen.getByLabelText("Returned on"), { target: { value: "2026-06-06" } });
    fireEvent.click(screen.getByText("Record return to work"));
    await waitFor(() =>
      expect(mocks.bffRequest).toHaveBeenCalledWith(`/api/occupational-health/oh-ext/oh/sick-leave/${UUID}/return`, {
        method: "POST",
        body: { returned_on: "2026-06-06", outcome: "fit_with_restrictions", restrictions: ["No lifting"] },
      }),
    );
  });
});
