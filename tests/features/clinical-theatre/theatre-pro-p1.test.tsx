import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TheatreCasePlannedItems,
  TheatreProcedureProduct,
} from "@/features/clinical-theatre/types/theatre-catalog.types";

const PRODUCT: TheatreProcedureProduct = {
  uuid: "prod-1",
  name: "Laparoscopic appendicectomy",
  display_name: "Laparoscopic appendicectomy",
  default_code: "PR-LAPP",
  list_price: "1000.00",
  price: "750.00",
  price_source: "pricelist",
  scope: "ipd_only_procedure",
  codes: [
    {
      uuid: "code-1",
      system: "icd10pcs",
      code: "0DTJ4ZZ",
      description: "Resection of Appendix, Percutaneous Endoscopic Approach",
      is_primary: true,
    },
  ],
};

const PLANNED: TheatreCasePlannedItems = {
  preference_card_uuid: "card-1",
  preference_card_title: "Dr Banda – lap appy",
  applied_at: "2026-11-12T08:00:00Z",
  setup: { positioning: "Supine", skin_prep: "Chlorhexidine", instrument_trays: ["Lap set"] },
  suggested_card_uuid: null,
  items: [
    {
      uuid: "item-1",
      product_uuid: "gauze",
      product_name: "Gauze swab",
      quantity: "10.00",
      notes: "",
      sequence: 1,
      status: "planned",
      status_label: "Planned",
      decided_by_name: "",
      decided_at: null,
      consumable_uuid: null,
    },
    {
      uuid: "item-2",
      product_uuid: "vicryl",
      product_name: "Vicryl 2-0",
      quantity: "2.00",
      notes: "",
      sequence: 2,
      status: "confirmed",
      status_label: "Confirmed (billed)",
      decided_by_name: "Sr Phiri",
      decided_at: "2026-11-12T09:00:00Z",
      consumable_uuid: "cons-1",
    },
  ],
};

const addTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const updateTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const removeTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const searchTheatreProcedureProducts = vi.fn().mockResolvedValue([PRODUCT]);
const billTheatreCaseProcedure = vi.fn().mockResolvedValue({});
const fetchTheatrePlannedItems = vi.fn().mockResolvedValue(PLANNED);
const confirmTheatrePlannedItem = vi.fn().mockResolvedValue(PLANNED);
const dismissTheatrePlannedItem = vi.fn().mockResolvedValue(PLANNED);
const confirmAllTheatrePlannedItems = vi.fn().mockResolvedValue(PLANNED);
const loadTheatrePreferenceCard = vi.fn().mockResolvedValue(PLANNED);
const saveTheatreCaseAsPreferenceCard = vi.fn().mockResolvedValue({ title: "Lap appy" });

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  addTheatreCaseProcedure: (...args: unknown[]) => addTheatreCaseProcedure(...args),
  updateTheatreCaseProcedure: (...args: unknown[]) => updateTheatreCaseProcedure(...args),
  removeTheatreCaseProcedure: (...args: unknown[]) => removeTheatreCaseProcedure(...args),
}));

vi.mock("@/features/clinical-theatre/services/theatre-catalog.service", () => ({
  searchTheatreProcedureProducts: (...args: unknown[]) =>
    searchTheatreProcedureProducts(...args),
  billTheatreCaseProcedure: (...args: unknown[]) => billTheatreCaseProcedure(...args),
  fetchTheatrePlannedItems: (...args: unknown[]) => fetchTheatrePlannedItems(...args),
  confirmTheatrePlannedItem: (...args: unknown[]) => confirmTheatrePlannedItem(...args),
  dismissTheatrePlannedItem: (...args: unknown[]) => dismissTheatrePlannedItem(...args),
  confirmAllTheatrePlannedItems: (...args: unknown[]) =>
    confirmAllTheatrePlannedItems(...args),
  loadTheatrePreferenceCard: (...args: unknown[]) => loadTheatrePreferenceCard(...args),
  saveTheatreCaseAsPreferenceCard: (...args: unknown[]) =>
    saveTheatreCaseAsPreferenceCard(...args),
}));

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { buildVisitTheatreBooking } from "@/features/clinical-theatre/components/TheatreBookFromVisitPanel";
import { TheatrePreferenceCardPanel } from "@/features/clinical-theatre/components/TheatrePreferenceCardPanel";
import { TheatreProceduresPanel } from "@/features/clinical-theatre/components/TheatreProceduresPanel";
import type {
  TheatreCase,
  TheatreCaseProcedure,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  canBillProcedure,
  formatProcedureCodes,
  parseTrayList,
  plannedItemCounts,
  priceSourceLabel,
  procedureBillingState,
} from "@/features/clinical-theatre/utils/theatre-catalog-display";

function procedure(overrides: Partial<TheatreCaseProcedure> = {}): TheatreCaseProcedure {
  return {
    uuid: "p1",
    name: "Laparoscopic appendicectomy",
    code: "0DTJ4ZZ",
    is_primary: true,
    sequence: 1,
    laterality: "",
    laterality_label: "",
    approach: "",
    approach_label: "",
    product_uuid: "prod-1",
    product_name: "Laparoscopic appendicectomy",
    visit_order_uuid: null,
    visit_order_description: "",
    surgeon_id: null,
    surgeon_name: "",
    notes: "",
    coding: PRODUCT.codes,
    is_legacy: false,
    is_billed: false,
    visit_order_status: "",
    ...overrides,
  };
}

function makeCase(overrides: Partial<TheatreCase> = {}): TheatreCase {
  return {
    uuid: "case-1",
    status: "in_theatre",
    procedure_description: "Laparoscopic appendicectomy",
    procedures: [procedure()],
    ...overrides,
  } as TheatreCase;
}

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe("theatre pro P1 helpers", () => {
  it("exposes catalogue, coding and preference card paths", () => {
    expect(CLINICAL_THEATRE_API_PATHS.procedureProducts).toBe("/theatre/procedure-products/");
    expect(CLINICAL_THEATRE_API_PATHS.procedureBill("c", "p")).toBe(
      "/theatre/cases/c/procedures/p/bill/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.procedureProductCodes("x")).toBe(
      "/theatre/procedure-products/x/codes/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.plannedItemConfirm("c", "i")).toBe(
      "/theatre/cases/c/planned-items/i/confirm/",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.preferenceCard("u")).toBe(
      "/api/theatre/preference-cards/u",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.procedureCodesImport).toBe(
      "/api/theatre/procedure-codes/import",
    );
  });

  it("formats codes primary first and labels price sources", () => {
    expect(
      formatProcedureCodes([
        { system: "cpt", code: "44970", description: "", is_primary: false },
        { system: "icd10pcs", code: "0DTJ4ZZ", description: "", is_primary: true },
      ]),
    ).toBe("ICD-10-PCS 0DTJ4ZZ, CPT 44970");
    expect(formatProcedureCodes([])).toBe("");
    expect(priceSourceLabel("pricelist")).toBe("Pricelist price");
    expect(priceSourceLabel("free_visit")).toBe("Free visit");
    expect(priceSourceLabel("list_price")).toBe("Catalogue price");
  });

  it("knows legacy, billed and billable procedures", () => {
    expect(procedureBillingState(procedure({ product_uuid: null }))).toBe("legacy");
    expect(procedureBillingState(procedure({ is_billed: true }))).toBe("billed");
    expect(procedureBillingState(procedure())).toBe("unbilled");
    expect(canBillProcedure(procedure(), "in_theatre")).toBe(true);
    expect(canBillProcedure(procedure(), "booked")).toBe(false);
    expect(canBillProcedure(procedure({ product_uuid: null }), "in_theatre")).toBe(false);
  });

  it("counts planned items and parses trays", () => {
    expect(plannedItemCounts(PLANNED.items)).toEqual({
      planned: 1,
      confirmed: 1,
      dismissed: 0,
    });
    expect(parseTrayList("Lap set\nMajor set, Lap set\n\n")).toEqual(["Lap set", "Major set"]);
  });

  it("books from a visit with a catalogue procedure", () => {
    const base = {
      visitUuid: "v",
      room: null,
      urgency: "elective" as const,
      start: "",
      end: "",
      description: "",
      surgeonId: 7,
      createAppointment: true,
    };
    expect(buildVisitTheatreBooking({ ...base, procedureProductUuid: "prod-1" })).toMatchObject(
      { procedures: [{ product: "prod-1" }], lead_surgeon: 7 },
    );
    expect(buildVisitTheatreBooking(base)).not.toHaveProperty("procedures");
  });
});

describe("theatre pro P1 components", () => {
  it("adds a procedure picked from the catalogue", async () => {
    wrap(<TheatreProceduresPanel theatreCase={makeCase({ status: "booked" })} canEdit />);
    fireEvent.change(screen.getByLabelText("Add procedure"), {
      target: { value: "appendic" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Laparoscopic appendicectomy/ }));
    expect(screen.getByTestId("theatre-procedure-product-selected")).toHaveTextContent(
      "ICD-10-PCS 0DTJ4ZZ",
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(addTheatreCaseProcedure).toHaveBeenCalledWith("case-1", {
        product: "prod-1",
        laterality: "",
        approach: "",
      }),
    );
    expect(searchTheatreProcedureProducts).toHaveBeenCalledWith({
      q: "appendic",
      caseUuid: "case-1",
    });
  });

  it("shows legacy and billing state and bills from the product", async () => {
    const theatreCase = makeCase({
      procedures: [
        procedure(),
        procedure({
          uuid: "p2",
          name: "Washout",
          is_primary: false,
          product_uuid: null,
          product_name: "",
          coding: [],
        }),
      ],
    });
    wrap(<TheatreProceduresPanel theatreCase={theatreCase} canEdit canBill />);
    expect(screen.getByText("Legacy (free text)")).toBeInTheDocument();
    expect(screen.getByText("Not billed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bill Washout" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bill Laparoscopic appendicectomy" }));
    await waitFor(() =>
      expect(billTheatreCaseProcedure).toHaveBeenCalledWith("case-1", "p1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Link Washout to the catalogue" }));
    expect(screen.getByTestId("theatre-procedure-link")).toBeInTheDocument();
  });

  it("confirms, dismisses and saves the preference card", async () => {
    wrap(
      <TheatrePreferenceCardPanel theatreCase={makeCase()} canRecord canManageCards />,
    );
    expect(await screen.findByText("Dr Banda – lap appy")).toBeInTheDocument();
    expect(screen.getByText(/Supine/)).toBeInTheDocument();
    expect(screen.getByText(/1 planned · 1 confirmed · 0/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Quantity of Gauze swab"), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Gauze swab" }));
    await waitFor(() =>
      expect(confirmTheatrePlannedItem).toHaveBeenCalledWith("case-1", "item-1", "8"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Gauze swab" }));
    await waitFor(() =>
      expect(dismissTheatrePlannedItem).toHaveBeenCalledWith("case-1", "item-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm all planned" }));
    await waitFor(() => expect(confirmAllTheatrePlannedItems).toHaveBeenCalledWith("case-1"));
    fireEvent.click(screen.getByRole("button", { name: "Save as my preference card" }));
    await waitFor(() =>
      expect(saveTheatreCaseAsPreferenceCard).toHaveBeenCalledWith("case-1", undefined),
    );
  });

  it("does not offer confirmation before the patient is in theatre", async () => {
    wrap(
      <TheatrePreferenceCardPanel
        theatreCase={makeCase({ status: "booked" })}
        canRecord
        canManageCards={false}
      />,
    );
    expect(await screen.findByText(/once the patient is in theatre/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Gauze swab" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save as my preference card" })).toBeNull();
  });
});
