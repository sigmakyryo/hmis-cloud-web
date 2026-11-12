import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TheatreCancellationReason,
  TheatreConsumable,
  TheatreReportSummary,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

const REASONS: TheatreCancellationReason[] = [
  {
    uuid: "r-bed",
    code: "no_bed",
    label: "No ward / ICU bed available",
    category: "resources",
    category_label: "Resources / equipment",
    requires_note: false,
    sort_order: 10,
    is_active: true,
  },
  {
    uuid: "r-other",
    code: "other",
    label: "Other (specify)",
    category: "other",
    category_label: "Other",
    requires_note: true,
    sort_order: 20,
    is_active: true,
  },
  {
    uuid: "r-old",
    code: "retired",
    label: "Retired reason",
    category: "patient",
    category_label: "Patient",
    requires_note: false,
    sort_order: 0,
    is_active: false,
  },
];

const fetchTheatreCancellationReasons = vi.fn().mockResolvedValue(REASONS);
const createTheatreCancellationReason = vi.fn().mockResolvedValue({});
const updateTheatreCancellationReason = vi.fn().mockResolvedValue({});
const returnTheatreConsumable = vi.fn().mockResolvedValue({});

vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", () => ({
  fetchTheatreCancellationReasons: (...args: unknown[]) =>
    fetchTheatreCancellationReasons(...args),
  createTheatreCancellationReason: (...args: unknown[]) =>
    createTheatreCancellationReason(...args),
  updateTheatreCancellationReason: (...args: unknown[]) =>
    updateTheatreCancellationReason(...args),
  returnTheatreConsumable: (...args: unknown[]) => returnTheatreConsumable(...args),
}));

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { TheatreCancelReasonForm } from "@/features/clinical-theatre/components/TheatreCancelReasonForm";
import { TheatreCancellationReasonsSettingsPanel } from "@/features/clinical-theatre/components/TheatreCancellationReasonsSettingsPanel";
import { TheatreConsumableReturnForm } from "@/features/clinical-theatre/components/TheatreConsumableReturnForm";
import { TheatreReportBody } from "@/features/clinical-theatre/pages/TheatreReportsPage";
import {
  cancellationFormError,
  groupCancellationReasons,
} from "@/features/clinical-theatre/utils/theatre-cancellation-display";
import {
  areReturnsAllowed,
  returnableQuantity,
  stockReturnError,
} from "@/features/clinical-theatre/utils/theatre-record-display";

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function issuedItem(overrides: Partial<TheatreConsumable> = {}): TheatreConsumable {
  return {
    uuid: "item-1",
    kind: "consumable",
    kind_label: "Consumable",
    status: "issued",
    status_label: "Issued from stock",
    product_uuid: "p1",
    product_name: "Vicryl 2-0",
    product_type: "consu",
    quantity: "5.00",
    returned_quantity: "1.00",
    returnable_quantity: "4.00",
    visit_order_uuid: "vo1",
    issued_at: null,
    issued_by_name: "",
    issued_location_uuid: "loc1",
    issued_batches: [],
    returns: [],
    manufacturer: "",
    lot_number: "",
    serial_number: "",
    expiry_date: null,
    implant_site: "",
    notes: "",
    created_at: "2026-11-12T08:00:00Z",
    ...overrides,
  };
}

describe("theatre advanced B: api paths", () => {
  it("routes returns and cancellation reasons", () => {
    expect(CLINICAL_THEATRE_API_PATHS.consumableReturn("c", "i")).toBe(
      "/theatre/cases/c/consumables/i/return/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.cancellationReasons).toBe(
      "/theatre/cancellation-reasons/",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.cancellationReason("r")).toBe(
      "/api/theatre/cancellation-reasons/r",
    );
  });
});

describe("theatre advanced B: cancellation helpers", () => {
  it("groups active reasons by category in a stable order", () => {
    const groups = groupCancellationReasons(REASONS);
    expect(groups.map((group) => group.category)).toEqual(["resources", "other"]);
  });

  it("validates the chosen reason and required note", () => {
    expect(cancellationFormError(REASONS, "", "")).toBe("Choose a reason.");
    expect(cancellationFormError(REASONS, "r-other", "")).toMatch(/Add a note/);
    expect(cancellationFormError(REASONS, "r-other", "Family request")).toBeNull();
    expect(cancellationFormError(REASONS, "r-bed", "")).toBeNull();
    expect(cancellationFormError([], "", "")).toBe("Enter a reason.");
    expect(cancellationFormError([], "", "free text")).toBeNull();
  });
});

describe("theatre advanced B: cancel reason form", () => {
  it("requires a standard reason and submits its uuid with the note", async () => {
    const onSubmit = vi.fn();
    wrap(
      <TheatreCancelReasonForm
        caseUuid="c1"
        actionLabel="Cancel"
        pending={false}
        onSubmit={onSubmit}
        onBack={() => undefined}
      />,
    );
    await screen.findByText("No ward / ICU bed available");
    const select = screen.getByLabelText("Reason (Cancel)");
    expect(screen.queryByText("Retired reason")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a reason.");
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: "r-bed" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), {
      target: { value: "ICU full" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSubmit).toHaveBeenCalledWith({
      cancellation_reason: "r-bed",
      reason: "ICU full",
    });
  });
});

describe("theatre advanced B: stock returns", () => {
  it("knows what can be returned and when", () => {
    expect(returnableQuantity(issuedItem())).toBe(4);
    expect(returnableQuantity(issuedItem({ status: "returned" }))).toBe(0);
    expect(
      returnableQuantity(
        issuedItem({ returnable_quantity: undefined, returned_quantity: "2" }),
      ),
    ).toBe(3);
    expect(areReturnsAllowed("discharged_home")).toBe(true);
    expect(areReturnsAllowed("booked")).toBe(false);
  });

  it("validates quantity, reason and batch split", () => {
    expect(stockReturnError(4, "0", "x")).toMatch(/greater than zero/);
    expect(stockReturnError(4, "5", "x")).toBe("Only 4 can be returned.");
    expect(stockReturnError(4, "2", " ")).toMatch(/reason/);
    expect(
      stockReturnError(4, "2", "x", [{ quantity: "1" }, { quantity: "0" }]),
    ).toMatch(/add up/);
    expect(stockReturnError(4, "2", "x", [{ quantity: "1" }, { quantity: "1" }])).toBeNull();
  });

  it("posts a partial return", async () => {
    const onDone = vi.fn();
    wrap(<TheatreConsumableReturnForm caseUuid="c1" item={issuedItem()} onDone={onDone} />);
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Unopened" } });
    fireEvent.click(screen.getByRole("button", { name: "Return to stock" }));
    await waitFor(() =>
      expect(returnTheatreConsumable).toHaveBeenCalledWith("c1", "item-1", {
        quantity: "2",
        reason: "Unopened",
      }),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("asks for a batch split when several batches were issued", async () => {
    wrap(
      <TheatreConsumableReturnForm
        caseUuid="c1"
        item={issuedItem({
          issued_batches: [
            { batch_id: 7, batch_number: "B-7", quantity: "2" },
            { batch_id: 8, batch_number: "B-8", quantity: "2" },
          ],
        })}
        onDone={() => undefined}
      />,
    );
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Spare" } });
    fireEvent.change(screen.getByLabelText("Batch B-8 (issued 2)"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Return to stock" }));
    await waitFor(() =>
      expect(returnTheatreConsumable).toHaveBeenCalledWith("c1", "item-1", {
        quantity: "2",
        reason: "Spare",
        batches: [{ batch_id: 8, quantity: "2" }],
      }),
    );
  });
});

describe("theatre advanced B: settings and reports", () => {
  it("lists reasons by category and adds a new one", async () => {
    wrap(<TheatreCancellationReasonsSettingsPanel />);
    await screen.findAllByTestId("theatre-cancellation-reason-row");
    expect(fetchTheatreCancellationReasons).toHaveBeenCalledWith({ includeInactive: true });
    expect(screen.getByText("Retired")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New reason"), {
      target: { value: "Blood not cross-matched" },
    });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "resources" } });
    fireEvent.click(screen.getByRole("button", { name: "Add reason" }));
    await waitFor(() =>
      expect(createTheatreCancellationReason).toHaveBeenCalledWith({
        label: "Blood not cross-matched",
        category: "resources",
        requires_note: false,
      }),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Retire" })[0]);
    await waitFor(() =>
      expect(updateTheatreCancellationReason).toHaveBeenCalledWith("r-bed", {
        is_active: false,
      }),
    );
  });

  it("shows on-the-day rate and reason breakdown", () => {
    const report = {
      date_from: "2026-11-01",
      date_to: "2026-11-12",
      days: 12,
      session_hours: 8,
      totals: {
        cases: 10,
        completed: 7,
        cancelled: 2,
        postponed: 1,
        in_progress: 0,
        operating_minutes: 600,
        average_case_minutes: 85,
      },
      by_status: [],
      by_urgency: [],
      by_room: [],
      by_surgeon: [],
      cancellations: [
        {
          case_uuid: "c9",
          status: "cancelled",
          procedure_description: "Hernia repair",
          scheduled_start: null,
          room_name: "OT 1",
          surgeon_name: "Dr Banda",
          reason: "No ward / ICU bed available",
          reason_code: "no_bed",
          reason_label: "No ward / ICU bed available",
          category: "resources",
          on_the_day: true,
          recorded_at: null,
          recorded_by: "",
        },
      ],
      cancellation_summary: {
        total: 3,
        on_the_day: 2,
        scheduled_cases: 10,
        on_the_day_rate_percent: 20,
        by_category: [{ category: "resources", label: "Resources / equipment", count: 3, on_the_day: 2 }],
        by_reason: [
          { code: "no_bed", label: "No ward / ICU bed available", category: "resources", count: 3, on_the_day: 2 },
        ],
      },
      stock_returns: {
        returns: 1,
        quantity: 2,
        by_product: [{ product_name: "Vicryl 2-0", returns: 1, quantity: 2 }],
      },
    } as TheatreReportSummary;
    wrap(<TheatreReportBody report={report} />);
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("Cancellations by reason")).toBeInTheDocument();
    expect(screen.getAllByText("Resources / equipment").length).toBeGreaterThan(0);
    expect(screen.getByText("Vicryl 2-0")).toBeInTheDocument();
  });
});
