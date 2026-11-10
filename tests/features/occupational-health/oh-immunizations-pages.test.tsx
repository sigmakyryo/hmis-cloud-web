import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { DuePage } from "@/app/(app)/immunizations/_components/due/DuePage";
import { VaccinesPage } from "@/app/(app)/immunizations/_components/vaccines/VaccinesPage";
import { RiskPage } from "@/app/(app)/immunizations/_components/risk/RiskPage";
import { GovernancePage } from "@/app/(app)/immunizations/_components/governance/GovernancePage";
import { PdcaPage } from "@/app/(app)/immunizations/_components/pdca/PdcaPage";

const mocks = vi.hoisted(() => ({
  dueFiltered: vi.fn(),
  vaccines: vi.fn(),
  lots: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/immunizations/due",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmDueFiltered: (...args: unknown[]) => mocks.dueFiltered(...args),
  fetchOhImmVaccines: (...args: unknown[]) => mocks.vaccines(...args),
  fetchOhImmLots: (...args: unknown[]) => mocks.lots(...args),
  fetchOhImmSchedules: vi.fn(async () => []),
  fetchOhImmCompliance: vi.fn(async () => ({
    summary: { people: 0, compliant: 0, percent_compliant: 0, overdue_rows: 0 },
    groups: [],
    overdue: [],
  })),
  seedOhImmExamples: vi.fn(),
  remindOhImm: vi.fn(),
  fetchOhImmExposureDueFollowups: vi.fn(async () => []),
  fetchOhImmFitTestsDue: vi.fn(async () => []),
  fetchOhImmPathways: vi.fn(async () => []),
  fetchOhImmTasks: vi.fn(async () => []),
  fetchOhImmNrProtocols: vi.fn(async () => []),
  seedOhImmRiskExamples: vi.fn(),
  seedOhImmNrHepb: vi.fn(),
  createOhImmPathway: vi.fn(),
  createOhImmTask: vi.fn(),
  assignOhImmTask: vi.fn(),
  createOhImmNrProtocol: vi.fn(),
  fetchOhImmZones: vi.fn(async () => []),
  seedOhImmZones: vi.fn(),
  fetchOhImmZoneClearance: vi.fn(async () => []),
  fetchOhImmAccessClients: vi.fn(async () => []),
  createOhImmAccessClient: vi.fn(),
  seedOhImmControls: vi.fn(),
  fetchOhImmControls: vi.fn(async () => []),
  fetchOhImmTaskHierarchy: vi.fn(),
  createOhImmFitTest: vi.fn(),
  fetchOhImmBoardMembers: vi.fn(async () => []),
  createOhImmBoardMember: vi.fn(),
  fetchOhImmAccommodations: vi.fn(async () => []),
  fileOhImmDeclination: vi.fn(),
  decideOhImmAccommodation: vi.fn(),
  fetchOhImmPdca: vi.fn(async () => ({ plan: [], do: [], check: [], act: [] })),
  updateOhImmRca: vi.fn(),
  addOhImmRcaAction: vi.fn(),
  fetchOhImmSeroAudits: vi.fn(async () => []),
  createOhImmSeroAudit: vi.fn(),
  recordOhImmSeroAggregates: vi.fn(),
  fetchOhImmVendors: vi.fn(async () => []),
  createOhImmVendor: vi.fn(),
  recordOhImmColdChain: vi.fn(),
  clearOhImmLotQuarantine: vi.fn(),
  createOhImmVaccine: vi.fn(),
  createOhImmLot: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dueFiltered.mockResolvedValue([]);
  mocks.vaccines.mockResolvedValue([]);
  mocks.lots.mockResolvedValue([]);
});

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

it("due page is standalone without tab bar", async () => {
  renderPage(<DuePage />);
  expect(screen.getByTestId("oh-immunizations-due-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Due & overdue" })).toBeVisible();
  expect(screen.queryByRole("navigation", { name: "Immunization sections" })).toBeNull();
  await waitFor(() => expect(screen.getByText("Nobody matches")).toBeVisible());
});

it("vaccines page is standalone", async () => {
  renderPage(<VaccinesPage />);
  expect(screen.getByTestId("oh-immunizations-vaccines-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Vaccines & lots" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Due / overdue" })).toBeNull();
  await waitFor(() => expect(screen.getByText(/No vaccines yet/i)).toBeVisible());
});

it("risk page is standalone", async () => {
  renderPage(<RiskPage />);
  expect(screen.getByTestId("oh-immunizations-risk-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Risk & tasks" })).toBeVisible();
  expect(screen.queryByRole("navigation", { name: "Immunization sections" })).toBeNull();
});

it("governance and pdca pages are standalone", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <GovernancePage />
    </QueryClientProvider>,
  );
  expect(screen.getByTestId("oh-immunizations-governance-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Governance" })).toBeVisible();
  unmount();

  render(
    <QueryClientProvider client={client}>
      <PdcaPage />
    </QueryClientProvider>,
  );
  expect(screen.getByTestId("oh-immunizations-pdca-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "PDCA" })).toBeVisible();
  await waitFor(() => expect(screen.getByText(/No RCA items yet/i)).toBeVisible());
});
