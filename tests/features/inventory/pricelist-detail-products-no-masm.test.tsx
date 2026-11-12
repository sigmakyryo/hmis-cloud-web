import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PricelistDetailProductsTab } from "@/features/inventory/components/detail/PricelistDetailProductsTab";

const fetchProductsMock = vi.hoisted(() => vi.fn());
const fetchSettingsMock = vi.hoisted(() => vi.fn());
const fetchStatsMock = vi.hoisted(() => vi.fn());
const useUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/catalog/services/catalog.service", () => ({
  fetchCatalogPricelistProducts: fetchProductsMock,
  fetchCatalogPricelistSettings: fetchSettingsMock,
  fetchPricelistProductSummaryStats: fetchStatsMock,
  removeCatalogPricelistProduct: vi.fn(),
  updateCatalogPricelistProduct: vi.fn(),
  startCatalogMasmCorePriceSync: vi.fn(),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/features/inventory/components/detail/AddPricelistProductDialog", () => ({
  AddPricelistProductDialog: () => null,
}));

vi.mock("@/features/inventory/components/detail/CopyPricelistProductsDialog", () => ({
  CopyPricelistProductsDialog: () => null,
}));

vi.mock("@/features/inventory/components/detail/PricelistCopyJobPanel", () => ({
  PricelistCopyJobPanel: () => null,
}));

vi.mock("@/features/inventory/components/detail/PricelistPayerSyncDialog", () => ({
  PRODUCTS_TAB_PAYER_SYNC_DRAFT: { importMissingTariffs: true },
  PricelistPayerSyncDialog: () => null,
}));

vi.mock("@/features/inventory/components/detail/PricelistProductsTable", () => ({
  PricelistProductsTable: () => <div data-testid="pricelist-products-table" />,
}));

const PRICELIST = {
  uuid: "pl-1",
  name: "MASM VIP",
  is_active: true,
  currency_code: "MWK",
};

const SETTINGS_WITH_SYNC = {
  pricelist_uuid: PRICELIST.uuid,
  schemes: [],
  core_provider_id: 154,
  sync_payer_name: "MASM",
  has_pricelist_sync_capability: true,
  pricelist_sync_enabled: true,
};

afterEach(() => {
  cleanup();
});

describe("PricelistDetailProductsTab Sync with Payer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserMock.mockReturnValue({ userData: { is_admin: true } });
    fetchProductsMock.mockResolvedValue({
      results: [
        {
          pricelist_uuid: PRICELIST.uuid,
          product_uuid: "prod-1",
          product_name: "Consult",
          fixed_price: "100",
        },
      ],
      pagination: null,
    });
    fetchStatsMock.mockResolvedValue({
      total_products: 1,
      medicines: 0,
      services: 1,
      with_tariff_code: 0,
      without_tariff_code: 1,
    });
    fetchSettingsMock.mockResolvedValue({
      pricelist_uuid: PRICELIST.uuid,
      schemes: [],
      core_provider_id: null,
      sync_payer_name: null,
      has_pricelist_sync_capability: false,
      pricelist_sync_enabled: false,
    });
  });

  it("does not show Sync with Payer when pricelist_sync capability is off", async () => {
    render(<PricelistDetailProductsTab pricelist={PRICELIST} isActive />);

    await waitFor(() => {
      expect(screen.getByTestId("pricelist-products-tab")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("pricelist-payer-sync-button")).not.toBeInTheDocument();
    expect(screen.queryByText("Update from MASM Core")).not.toBeInTheDocument();
  });

  it("shows an enabled Sync with Payer button for eligible tenant admins", async () => {
    fetchSettingsMock.mockResolvedValue(SETTINGS_WITH_SYNC);

    render(<PricelistDetailProductsTab pricelist={PRICELIST} isActive />);

    await waitFor(() => {
      expect(screen.getByTestId("pricelist-payer-sync-button")).toBeInTheDocument();
    });
    const button = screen.getByTestId("pricelist-payer-sync-button");
    expect(button).toHaveTextContent("Sync with MASM");
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId("pricelist-payer-sync-hint")).not.toBeInTheDocument();
  });

  it("shows a greyed Sync with Payer button for non-admins", async () => {
    useUserMock.mockReturnValue({ userData: { is_admin: false } });
    fetchSettingsMock.mockResolvedValue(SETTINGS_WITH_SYNC);

    render(<PricelistDetailProductsTab pricelist={PRICELIST} isActive />);

    await waitFor(() => {
      expect(screen.getByTestId("pricelist-payer-sync-button")).toBeDisabled();
    });
    expect(screen.getByTestId("pricelist-payer-sync-button")).toHaveTextContent(
      "Sync with MASM",
    );
    expect(screen.getByTestId("pricelist-payer-sync-hint")).toHaveTextContent(
      "Only administrators can run a sync.",
    );
  });

  it("places sync status hints to the left of the Sync button", async () => {
    fetchSettingsMock.mockResolvedValue({
      ...SETTINGS_WITH_SYNC,
      pricelist_sync_enabled: false,
      core_provider_id: null,
    });

    render(<PricelistDetailProductsTab pricelist={PRICELIST} isActive />);

    await waitFor(() => {
      expect(screen.getByTestId("pricelist-payer-sync-hint")).toBeInTheDocument();
    });

    const hint = screen.getByTestId("pricelist-payer-sync-hint");
    const button = screen.getByTestId("pricelist-payer-sync-button");
    expect(hint.parentElement?.contains(button)).toBe(true);
    expect(
      Boolean(
        hint.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ).toBe(true);
  });
});
