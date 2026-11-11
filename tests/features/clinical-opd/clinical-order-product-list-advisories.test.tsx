import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClinicalOrderProductList } from "@/features/clinical-opd/components/tabs/ClinicalOrderProductList";

const fetchCatalogProductsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/catalog/services/catalog.service", () => ({
  fetchCatalogProducts: fetchCatalogProductsMock,
}));

vi.mock("@/features/clinical-opd/hooks/use-workspace-routing", () => ({
  useWorkspaceRouting: () => ({
    specialty: { procedureContext: "opd" },
  }),
}));

afterEach(() => {
  cleanup();
});

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ClinicalOrderProductList
        itemType="LABORATORY"
        enabled
        visitUuid="visit-1"
        busyProductUuid={null}
        orderedProductOrderUuids={new Map()}
        onAddProduct={() => undefined}
        onCancelOrder={() => undefined}
      />
    </QueryClientProvider>,
  );
}

describe("ClinicalOrderProductList payer advisories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders subtle red advisory text when payer_advisories are present", async () => {
    fetchCatalogProductsMock.mockResolvedValue({
      results: [
        {
          uuid: "prod-1",
          name: "CBC Panel",
          display_name: "CBC Panel",
          default_code: "LAB-CBC",
          payer_advisories: [
            {
              code: "requires_preauthorization",
              message: "Pre-authorisation required",
            },
          ],
        },
      ],
      pagination: { next: null },
    });

    renderList();

    await waitFor(() => {
      expect(
        screen.getByTestId("clinical-order-product-advisories-prod-1"),
      ).toHaveTextContent("Pre-authorisation required");
    });
    expect(fetchCatalogProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({ visit_uuid: "visit-1" }),
    );
  });

  it("omits advisory line when payer_advisories are empty", async () => {
    fetchCatalogProductsMock.mockResolvedValue({
      results: [
        {
          uuid: "prod-2",
          name: "Urinalysis",
          display_name: "Urinalysis",
          default_code: "LAB-UA",
          payer_advisories: [],
        },
      ],
      pagination: { next: null },
    });

    renderList();

    await waitFor(() => {
      expect(screen.getByText("Urinalysis")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("clinical-order-product-advisories-prod-2"),
    ).not.toBeInTheDocument();
  });
});
