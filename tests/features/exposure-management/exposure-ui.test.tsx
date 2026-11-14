import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ bffRequest: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/exposure-management",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/bff-client", () => ({
  bffRequest: (...args: unknown[]) => mocks.bffRequest(...args),
  BffError: class extends Error {},
}));

import { BandChip, EvaluationBadge } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureHeatmap } from "@/features/exposure-management/components/ExposureHeatmap";
import { ExposureImportSheet } from "@/features/exposure-management/components/ExposureImportSheet";
import { LinkedExposureEvent } from "@/features/exposure-management/components/LinkedExposureEvent";
import { ExposureEventsPage } from "@/features/exposure-management/pages/ExposureEventsPage";
import { ExposureOverviewPage } from "@/features/exposure-management/pages/ExposureOverviewPage";
import type { ExposureDashboard, ExposureEvent } from "@/features/exposure-management/exposure.types";

function wrap(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

const event: ExposureEvent = {
  uuid: "e1", group_uuid: "g1", group_name: "Foundry", agent_uuid: "a1", agent_code: "SILICA", agent_name: "Respirable silica",
  measurement_uuid: "m1", customer_uuid: "c1", worker_label: "Worker A", kind: "measurement", severity: "critical", status: "open",
  detected_at: "2026-11-10T08:00:00Z", due_on: "2026-11-12", overdue: true, summary: "Result 3x limit", investigation: "",
  removal_from_exposure: false, iod_case_uuid: null, ai_draft: null, ai_status: "", closed_at: null, closed_by: "",
};

const dashboard: ExposureDashboard = {
  generated_at: "2026-11-14T00:00:00Z",
  kpis: { groups: 2, agents: 2, measurements_30d: 5, open_events: 1, open_critical: 1, open_exceeds: 0, open_action: 0, overdue_events: 1, plans_overdue: 1, plans_due_soon: 0, calibrations_overdue: 0, calibrations_due_soon: 0, reviews_due: 0, controls_overdue: 0 },
  bands: {},
  agents: [{ uuid: "a1", code: "SILICA", name: "Respirable silica", category: "dust" }, { uuid: "a2", code: "NOISE", name: "Noise", category: "noise" }],
  groups: [{
    uuid: "g1", code: "F", name: "Foundry", members: 12,
    cells: [
      { agent_id: 1, band: 4, confidence: "low", sample_count: 3, p95: 0.2, oel_value: 0.05, oel_unit: "mg/m3", status: "draft", open_events: 1 },
      null,
    ],
  }],
  events: [event],
  biological: { open_incidents: 2, urgent: 1, last_90_days: 4, followups_due: 3 },
};

beforeEach(() => {
  mocks.bffRequest.mockReset();
});
afterEach(cleanup);

describe("exposure badges", () => {
  it("never relies on colour alone: band and evaluation carry text", () => {
    render(<><BandChip band={4} confidence="low" /><BandChip band={null} /><EvaluationBadge evaluation="ok" belowLod /></>);
    expect(screen.getByText(/Band 4 · Over limit/)).toBeTruthy();
    expect(screen.getByText("No data")).toBeTruthy();
    expect(screen.getByText(/Within limit · below LOD/)).toBeTruthy();
  });
});

describe("ExposureHeatmap", () => {
  it("shows bands with labels and an explicit 'No data' state for empty cells", () => {
    render(<ExposureHeatmap dashboard={dashboard} />);
    expect(screen.getByText("Over limit")).toBeTruthy();
    expect(screen.getByText("No data")).toBeTruthy();
    expect(screen.getByText(/1 open/)).toBeTruthy();
    expect(screen.getByText(/Fewer than six samples/)).toBeTruthy();
  });
});

describe("ExposureOverviewPage", () => {
  it("renders KPIs, open events and the biological incident summary", async () => {
    mocks.bffRequest.mockResolvedValue(dashboard);
    wrap(<ExposureOverviewPage />);
    expect(await screen.findByText("Open events")).toBeTruthy();
    expect(screen.getByText("Respirable silica", { selector: "a" })).toBeTruthy();
    expect(screen.getByText(/2 open, 1 urgent, 3 follow-ups due/)).toBeTruthy();
    expect(mocks.bffRequest).toHaveBeenCalledWith("/api/occupational-health/exposure/dashboard");
  });

  it("shows an error state instead of an empty dashboard", async () => {
    mocks.bffRequest.mockImplementation(async () => {
      throw new Error("Service unavailable");
    });
    wrap(<ExposureOverviewPage />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Service unavailable")).toBeTruthy();
  });
});

describe("ExposureEventsPage", () => {
  it("lists events and filters to critical via the insight strip", async () => {
    mocks.bffRequest.mockResolvedValue([event, { ...event, uuid: "e2", severity: "action_level", agent_name: "Noise" }]);
    wrap(<ExposureEventsPage />);
    expect(await screen.findByText("Respirable silica")).toBeTruthy();
    expect(screen.getByText("Noise")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Critical/ }));
    await waitFor(() => expect(screen.queryByText("Noise")).toBeNull());
  });

  it("explains an empty inbox", async () => {
    mocks.bffRequest.mockResolvedValue([]);
    wrap(<ExposureEventsPage />);
    expect(await screen.findByText("No overexposure events")).toBeTruthy();
  });
});

describe("ExposureImportSheet", () => {
  it("lists problem rows and keeps Import disabled until every row is valid", async () => {
    mocks.bffRequest.mockResolvedValue({ valid: false, imported: 0, rows: [{ row: 2, ok: false, errors: ["Unknown agent"], group: "F", agent: "X", evaluation: null }] });
    wrap(<ExposureImportSheet onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText("CSV text"), { target: { value: "group_code,agent_code\nF,X" } });
    fireEvent.click(screen.getByRole("button", { name: "Check rows" }));
    expect(await screen.findByText(/Row 2: Unknown agent/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Import" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("LinkedExposureEvent", () => {
  it("renders nothing when the case has no linked event", async () => {
    mocks.bffRequest.mockResolvedValue(null);
    const { container } = wrap(<LinkedExposureEvent iodCaseUuid="iod1" />);
    await waitFor(() => expect(mocks.bffRequest).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("links to the event when there is one", async () => {
    mocks.bffRequest.mockResolvedValue(event);
    wrap(<LinkedExposureEvent iodCaseUuid="iod1" />);
    const link = await screen.findByRole("link", { name: "Open the exposure event" });
    expect(link.getAttribute("href")).toBe("/exposure-management/events?event=e1");
  });
});
