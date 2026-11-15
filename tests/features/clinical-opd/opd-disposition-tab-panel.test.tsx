import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OpdDispositionTabPanel } from "@/features/clinical-opd/components/tabs/OpdDispositionTabPanel";
import { fetchExternalTransfers } from "@/features/clinical-opd/services/external-care.service";

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock(
  "@/features/clinical-opd/components/detail/opd-encounter-workspace-context",
  () => ({
    useOpdEncounterWorkspace: () => ({
      isChartLocked: false,
      capabilities: ["record_disposition"],
    }),
  }),
);

vi.mock("@/features/clinical-opd/hooks/use-clinical-opd", () => ({
  useEncounterDisposition: () => ({
    data: null,
    isLoading: false,
  }),
  useUpsertEncounterDisposition: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/features/clinical/services/clinical-catalog.service", () => ({
  fetchClinicalClinics: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/clinical-opd/services/external-care.service", () => ({
  fetchEncounterOutsideHospitals: vi.fn().mockResolvedValue([]),
  fetchEncounterReferenceKinds: vi.fn().mockResolvedValue([]),
  fetchExternalTransfers: vi.fn().mockResolvedValue([]),
  fetchExternalReferences: vi.fn().mockResolvedValue([]),
  createExternalTransfer: vi.fn(),
  uploadTransferDocument: vi.fn(),
  createExternalReference: vi.fn(),
  uploadReferenceDocument: vi.fn(),
  archiveExternalTransfer: vi.fn(),
  archiveExternalReference: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OpdDispositionTabPanel visitUuid="visit-1" encounterUuid="enc-1" />
    </QueryClientProvider>,
  );
}

describe("OpdDispositionTabPanel", () => {
  it("treats a missing disposition as an empty optional form", () => {
    renderPanel();

    expect(screen.getByTestId("opd-disposition-tab-panel")).toBeInTheDocument();
    expect(
      screen.getByText(/Closing the visit does not require a disposition/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save disposition" })).toBeInTheDocument();
  });

  it("shows the outside hospital form when the outcome is referred", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Outcome"), {
      target: { value: "referred" },
    });

    expect(screen.getByTestId("external-care-outbound")).toBeInTheDocument();
    expect(screen.getByTestId("outbound-hospital-name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record referral" })).toBeInTheDocument();
  });

  it("renders a saved inbound transfer with its reference and document", async () => {
    vi.mocked(fetchExternalTransfers).mockResolvedValue([
      {
        uuid: "transfer-1",
        direction: "inbound",
        hospital: {
          uuid: "hospital-1",
          name: "District Hospital",
          town: "Blantyre",
          phone: "",
        },
        their_reference: "DH-22",
        reason: "Surgical review",
        contact: "",
        occurred_at: "2026-01-01T00:00:00Z",
        notes: "",
        encounter_uuid: "enc-1",
        documents: [
          {
            uuid: "document-1",
            file_name: "letter.pdf",
            file_mime_type: "application/pdf",
            file_size: 12,
          },
        ],
      },
    ]);

    renderPanel();

    expect(await screen.findByText("DH-22")).toBeInTheDocument();
    expect(screen.getByText("letter.pdf")).toBeInTheDocument();
  });
});
