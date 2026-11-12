import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { OhEmployeeImmunizationsPanel } from "@/features/occupational-health/components/OhEmployeeImmunizationsPanel";

const mocks = vi.hoisted(() => ({
  patient: vi.fn(),
  vaccines: vi.fn(),
  lots: vi.fn(),
  toast: vi.fn(),
  issue: vi.fn(),
  downloadPdf: vi.fn(),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/features/occupational-health/services/immunisation.service", () => ({
  fetchOhImmPatient: (...args: unknown[]) => mocks.patient(...args),
  fetchOhImmVaccines: (...args: unknown[]) => mocks.vaccines(...args),
  fetchOhImmLots: (...args: unknown[]) => mocks.lots(...args),
  administerOhImmDose: vi.fn(),
  createOhImmAefi: vi.fn(),
  createOhImmExemption: vi.fn(),
  recordOhImmTitre: vi.fn(),
  issueOhImmCertificate: (...args: unknown[]) => mocks.issue(...args),
  downloadOhImmCertificatePdf: (...args: unknown[]) => mocks.downloadPdf(...args),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.patient.mockResolvedValue({
    customer_uuid: "cust-1",
    statuses: [],
    doses: [],
    exemptions: [],
    aefi: [],
  });
  mocks.vaccines.mockResolvedValue([]);
  mocks.lots.mockResolvedValue([]);
});

it("shows Download PDF on the employee immunizations panel", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OhEmployeeImmunizationsPanel customerUuid="cust-1" />
    </QueryClientProvider>,
  );
  expect(await screen.findByTestId("oh-imm-download-pdf")).toBeVisible();
  expect(screen.getByRole("button", { name: "Download PDF" })).toBeVisible();
});
