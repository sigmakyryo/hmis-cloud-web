import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DaAnomaliesPage } from "@/app/(app)/drug-alcohol/_components/anomalies/DaAnomaliesPage";
import { DaRiskPage } from "@/app/(app)/drug-alcohol/_components/risk/DaRiskPage";
import { textToTiers, tiersToText } from "@/features/occupational-health/services/drug-alcohol-risk.service";
import { BffError } from "@/lib/bff-client";
import { resolveDrugAlcoholPath } from "@/lib/server/drug-alcohol-bff";

const mocks = vi.hoisted(() => ({
  pools: vi.fn(),
  proposals: vi.fn(),
  propose: vi.fn(),
  decide: vi.fn(),
  verify: vi.fn(),
  anomalies: vi.fn(),
  scan: vi.fn(),
  decideAnomaly: vi.fn(),
  draws: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/drug-alcohol/risk",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/drug-alcohol.service", () => ({
  fetchDaDraws: (...args: unknown[]) => mocks.draws(...args),
}));
vi.mock("@/features/occupational-health/services/drug-alcohol-risk.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/occupational-health/services/drug-alcohol-risk.service")>();
  return {
    ...actual,
    fetchDaRiskPools: (...args: unknown[]) => mocks.pools(...args),
    fetchDaRateProposals: (...args: unknown[]) => mocks.proposals(...args),
    proposeDaRates: (...args: unknown[]) => mocks.propose(...args),
    decideDaRateProposal: (...args: unknown[]) => mocks.decide(...args),
    verifyDaDraw: (...args: unknown[]) => mocks.verify(...args),
    saveDaRiskConfig: vi.fn(),
    fetchDaAnomalies: (...args: unknown[]) => mocks.anomalies(...args),
    scanDaAnomalies: (...args: unknown[]) => mocks.scan(...args),
    decideDaAnomaly: (...args: unknown[]) => mocks.decideAnomaly(...args),
  };
});

const UUID = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

const POOL = {
  uuid: UUID,
  name: "Mine crew",
  annual_drug_rate: 50,
  annual_alcohol_rate: 10,
  frequency: "monthly",
  risk: {
    enabled: true,
    weighted_draw: true,
    auto_propose: false,
    lookback_months: 12,
    role_tiers: { blaster: 3 },
    site_tiers: {},
    tier_weights: { "1": 1, "2": 1.5, "3": 2 },
    incident_weight: 0.5,
    site_incident_weight: 0.25,
    max_weight: 3,
    base_drug_rate: 50,
    base_alcohol_rate: 10,
    min_drug_rate: 25,
    max_drug_rate: 75,
    min_alcohol_rate: 10,
    max_alcohol_rate: 50,
  },
  latest_proposal: null,
};

const PROPOSAL = {
  uuid: "prop-11111111",
  pool_uuid: UUID,
  pool_name: "Mine crew",
  status: "proposed",
  current_drug_rate: 50,
  current_alcohol_rate: 10,
  proposed_drug_rate: 75,
  proposed_alcohol_rate: 15.5,
  basis: { population: 10, mean_weight: 1.55, tier_counts: { "1": 5, "2": 0, "3": 5 }, incidents: 1, lookback_months: 12 },
  proposed_at: "2026-11-10T05:00:00+02:00",
  decided_at: null,
  decided_by_initials: "",
  decision_note: "",
};

const ANOMALY = {
  uuid: "anom-11111111",
  dimension: "collector",
  subject: "AB",
  metric: "dilute",
  events: 8,
  total: 25,
  rate: 0.32,
  baseline_rate: 0.0167,
  z_score: 12.1,
  p_value: 0.00000001,
  window_from: "2026-05-10",
  window_to: "2026-11-10",
  status: "open",
  review_note: "",
  reviewed_by_initials: "",
  reviewed_at: null,
  detected_at: "2026-11-10T05:00:00+02:00",
};

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pools.mockResolvedValue([POOL]);
  mocks.proposals.mockResolvedValue([PROPOSAL]);
  mocks.draws.mockResolvedValue([]);
  mocks.anomalies.mockResolvedValue([ANOMALY]);
});

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("risk BFF allowlist", () => {
  it("allows the risk, anomaly and draw-check endpoints and nothing broader", () => {
    expect(resolveDrugAlcoholPath("GET", ["risk", "pools"])?.path).toBe("/oh-da/risk/pools");
    expect(resolveDrugAlcoholPath("PATCH", ["risk", "pools", UUID])).not.toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["risk", "pools", UUID, "propose"])).not.toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["risk", "proposals", UUID, "approve"])).not.toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["risk", "proposals", UUID, "delete"])).toBeNull();
    expect(resolveDrugAlcoholPath("GET", ["draws", UUID, "verify"])).not.toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["anomalies", "scan"])).not.toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["anomalies", UUID, "dismiss"])).not.toBeNull();
    expect(resolveDrugAlcoholPath("POST", ["anomalies", UUID, "reopen"])).toBeNull();
    expect(resolveDrugAlcoholPath("PATCH", ["anomalies", UUID])).toBeNull();
  });

  it("parses risk tiers from plain lines", () => {
    expect(textToTiers("Blaster = 3\nClerk=1\nbad line\nDriver = 7")).toEqual({ Blaster: 3, Clerk: 1 });
    expect(tiersToText({ blaster: 3 })).toBe("blaster = 3");
  });
});

it("risk page lists pools and proposes new rates", async () => {
  mocks.propose.mockResolvedValue(PROPOSAL);
  renderPage(<DaRiskPage />);
  expect(screen.getByTestId("oh-da-risk-page")).toBeVisible();
  await waitFor(() => expect(screen.getByText("Mine crew")).toBeVisible());
  expect(screen.getByText("On, weighted picks")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Work out rates" }));
  await waitFor(() => expect(mocks.propose).toHaveBeenCalledWith(UUID));
});

it("approving a waiting change sends the decision", async () => {
  mocks.decide.mockResolvedValue({ ...PROPOSAL, status: "approved" });
  renderPage(<DaRiskPage />);
  fireEvent.click(screen.getByRole("button", { name: /Waiting for approval/ }));
  await waitFor(() => expect(screen.getByText("Drugs 75% · Alcohol 15.5%")).toBeVisible());
  fireEvent.click(screen.getByRole("button", { name: "Decide" }));
  expect(screen.getByTestId("oh-da-proposal-sheet")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await waitFor(() => expect(mocks.decide).toHaveBeenCalledWith("prop-11111111", "approve", ""));
});

it("risk page explains when the user may not manage rates", async () => {
  mocks.pools.mockRejectedValue(new BffError("Forbidden", 403));
  renderPage(<DaRiskPage />);
  await waitFor(() =>
    expect(screen.getByText("Only an administrator or the medical review officer can manage testing rates.")).toBeVisible(),
  );
});

it("anomalies page shows the pattern in plain words and dismissing needs a note", async () => {
  mocks.decideAnomaly.mockResolvedValue({ ...ANOMALY, status: "dismissed" });
  renderPage(<DaAnomaliesPage />);
  await waitFor(() => expect(screen.getByText("Collector AB")).toBeVisible());
  expect(screen.getByText("Dilute samples")).toBeVisible();
  expect(screen.getByText("32% (8 of 25)")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Look at" }));
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
  expect(mocks.decideAnomaly).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Review note"), { target: { value: "Heat wave" } });
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  await waitFor(() => expect(mocks.decideAnomaly).toHaveBeenCalledWith("anom-11111111", "dismiss", "Heat wave"));
});

it("anomalies page runs a check on demand", async () => {
  mocks.anomalies.mockResolvedValue([]);
  mocks.scan.mockResolvedValue({ created: 0, updated: 0, checked: 16 });
  renderPage(<DaAnomaliesPage />);
  await waitFor(() => expect(screen.getByText("Nothing unusual")).toBeVisible());
  fireEvent.click(screen.getByRole("button", { name: "Check last 6 months" }));
  await waitFor(() => expect(mocks.scan).toHaveBeenCalledWith(6));
});
