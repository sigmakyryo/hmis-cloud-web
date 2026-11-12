import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreCaseTray,
  TheatreCountItem,
  TheatreCountSheet,
  TheatreCountState,
  TheatreTray,
} from "@/features/clinical-theatre/types/theatre-cssd.types";

const api = vi.hoisted(() => ({
  fetchTheatreCounts: vi.fn(),
  startTheatreCount: vi.fn(),
  recordTheatreCounts: vi.fn(),
  confirmTheatreCount: vi.fn(),
  resolveTheatreCount: vi.fn(),
  fetchTheatreCountWitnesses: vi.fn(),
  fetchTheatreCaseTrays: vi.fn(),
  fetchTheatreAvailableTrays: vi.fn(),
  assignTheatreTray: vi.fn(),
  fetchTheatreImplantRecall: vi.fn(),
}));

vi.mock("@/features/clinical-theatre/services/theatre-cssd.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/clinical-theatre/services/theatre-cssd.service")>();
  return {
    ...actual,
    ...Object.fromEntries(
      Object.entries(api).map(([key, fn]) => [key, (...args: unknown[]) => fn(...args)]),
    ),
  };
});

// Radix Select does not open in jsdom; render a native <select> instead.
vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  type AnyProps = { children?: ReactNode; [key: string]: unknown };
  function SelectItem(props: AnyProps) {
    return <>{props.children}</>;
  }
  function SelectTrigger(props: AnyProps) {
    return <>{props.children}</>;
  }
  function Passthrough(props: AnyProps) {
    return <>{props.children}</>;
  }
  function collect(node: ReactNode, found: { items: AnyProps[]; label?: string }) {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement<AnyProps>(child)) return;
      if (child.type === SelectItem) found.items.push(child.props);
      else {
        if (child.type === SelectTrigger) found.label = child.props["aria-label"] as string;
        collect(child.props.children, found);
      }
    });
  }
  function Select(props: { value?: string; onValueChange?: (value: string) => void; children?: ReactNode }) {
    const found: { items: AnyProps[]; label?: string } = { items: [] };
    collect(props.children, found);
    return (
      <select
        aria-label={found.label}
        value={props.value ?? ""}
        onChange={(event) => props.onValueChange?.(event.target.value)}
      >
        <option value="">—</option>
        {found.items.map((item) => (
          <option key={String(item.value)} value={String(item.value)} disabled={Boolean(item.disabled)}>
            {React.Children.toArray(item.children).join("")}
          </option>
        ))}
      </select>
    );
  }
  return {
    Select,
    SelectItem,
    SelectTrigger,
    SelectContent: Passthrough,
    SelectValue: () => null,
  };
});

const capabilities = { current: [] as string[] };
vi.mock("@/features/clinical-opd/hooks/use-clinical-opd", () => ({
  useMyClinicalCapabilities: () => ({ data: { capabilities: capabilities.current }, isLoading: false }),
}));

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { ROUTES } from "@/constants/routes";
import {
  TheatreCaseTraysPanel,
  trayIssuesFromDraft,
} from "@/features/clinical-theatre/components/TheatreCaseTraysPanel";
import {
  TheatreCountSheetPanel,
  phaseCounts,
} from "@/features/clinical-theatre/components/TheatreCountSheetPanel";
import { loadableTrays } from "@/features/clinical-theatre/components/TheatreCssdCyclesTab";
import { traySetDraftProblem } from "@/features/clinical-theatre/components/TheatreCssdSettingsPanel";
import {
  TheatreImplantRecallPage,
  cleanRecallFilters,
} from "@/features/clinical-theatre/pages/TheatreImplantRecallPage";
import {
  caseImplants,
  confirmBlocker,
  countMismatches,
  implantDraftProblem,
  implantSummary,
  recallFiltersEmpty,
} from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { safetyGateBlocker } from "@/features/clinical-theatre/utils/theatre-safety-display";
import { THEATRE_INTRA_OP_SECTIONS } from "@/features/clinical-theatre/utils/theatre-workflow";
import { THEATRE_ROLE_CAPABILITIES } from "@/features/settings/constants/clinical-role-capability-config";
import { THEATRE_QUERY_KEYS } from "@/lib/server/theatre-bff";

const P3_CAPABILITIES = [
  "manage_theatre_trays",
  "record_theatre_sterilisation",
  "assign_theatre_trays",
  "record_theatre_counts",
  "sign_theatre_count_resolution",
  "view_theatre_implant_recall",
];

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function theatreCase(status: TheatreCase["status"] = "in_theatre"): TheatreCase {
  return { uuid: "case-1", status, urgency: "elective", procedures: [] } as unknown as TheatreCase;
}

function item(overrides: Partial<TheatreCountItem> = {}): TheatreCountItem {
  return {
    uuid: "i-1",
    category: "swab",
    category_label: "Swabs",
    name: "Raytec 10x10",
    product_uuid: null,
    tray_barcode: "",
    initial: 10,
    added: 5,
    expected: 15,
    first_count: null,
    closing_count: null,
    final_count: null,
    ...overrides,
  };
}

function sheet(overrides: Partial<TheatreCountSheet> = {}): TheatreCountSheet {
  return {
    uuid: "s-1",
    status: "open",
    status_label: "Open",
    search_performed: false,
    search_notes: "",
    xray: "",
    xray_label: "",
    outcome: "",
    resolution_signed_by_name: "",
    resolution_signed_at: null,
    items: [item()],
    confirmations: [
      {
        uuid: "c-1",
        phase: "initial",
        phase_label: "Initial",
        counted_by_name: "Sr Phiri",
        witnessed_by_name: "Sr Banda",
        confirmed_at: "2026-11-12T08:00:00Z",
        is_correct: true,
        discrepancies: [],
        notes: "",
      },
    ],
    ...overrides,
  };
}

function tray(overrides: Partial<TheatreTray> = {}): TheatreTray {
  return {
    uuid: "t-1",
    barcode: "TR-001",
    label: "",
    status: "awaiting_reprocessing",
    status_label: "Awaiting reprocessing",
    tray_set_uuid: "set-1",
    tray_set_name: "Major set",
    tray_set_code: "MAJ",
    method: "steam",
    sterile_until: null,
    quarantine_reason: "",
    notes: "",
    is_active: true,
    last_cycle: null,
    open_issue_count: 0,
    problem: "",
    ...overrides,
  };
}

async function pickOption(select: HTMLElement, name: string) {
  const option = (await screen.findByRole("option", { name })) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: option.value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  capabilities.current = [];
});

afterEach(() => cleanup());

describe("theatre pro P3 wiring", () => {
  it("maps BFF routes to the Django endpoints", () => {
    expect(BFF_CLINICAL_THEATRE_ROUTES.counts("c1")).toBe("/api/theatre/cases/c1/counts");
    expect(CLINICAL_THEATRE_API_PATHS.counts("c1")).toBe("/theatre/cases/c1/counts/");
    expect(CLINICAL_THEATRE_API_PATHS.countConfirm("c1")).toBe("/theatre/cases/c1/counts/confirm/");
    expect(CLINICAL_THEATRE_API_PATHS.caseTrayReturn("c1", "x")).toBe("/theatre/cases/c1/trays/x/return/");
    expect(CLINICAL_THEATRE_API_PATHS.cycleRecall("y")).toBe("/theatre/sterilisation-cycles/y/recall/");
    expect(CLINICAL_THEATRE_API_PATHS.implantRecallExport).toBe("/theatre/implants/recall/export/");
    expect(ROUTES.clinicalTheatreCssd).toBe("/clinical/theatre/cssd");
    expect(ROUTES.clinicalTheatreImplants).toBe("/clinical/theatre/implants");
  });

  it("forwards the recall and CSSD filters through the BFF", () => {
    for (const key of ["lot", "serial", "manufacturer", "steriliser", "tray_set", "include_retired", "assignable"]) {
      expect(THEATRE_QUERY_KEYS).toContain(key);
    }
  });

  it("exposes the new capabilities and the counts / trays sub-sections", () => {
    const keys = THEATRE_ROLE_CAPABILITIES.map((row) => row.key);
    for (const key of P3_CAPABILITIES) expect(keys).toContain(key);
    const sections = THEATRE_INTRA_OP_SECTIONS.map((row) => row.id);
    expect(sections).toContain("counts");
    expect(sections).toContain("trays");
  });
});

describe("count helpers", () => {
  it("flags lines that do not match the expected number", () => {
    const items = [item({ first_count: 15 }), item({ uuid: "i-2", first_count: 14 })];
    expect(countMismatches(items, "first").map((row) => row.uuid)).toEqual(["i-2"]);
    expect(countMismatches(items, "initial")).toEqual([]);
  });

  it("orders confirmations: initial first, then every line counted", () => {
    expect(confirmBlocker(null, "initial")).toMatch(/Start/);
    expect(confirmBlocker(sheet({ confirmations: [] }), "first")).toMatch(/initial count first/);
    expect(confirmBlocker(sheet(), "first")).toMatch(/1 missing/);
    expect(confirmBlocker(sheet({ items: [item({ first_count: 15 })] }), "first")).toBe("");
    expect(confirmBlocker(sheet({ status: "reconciled" }), "final")).toMatch(/closed/);
  });

  it("merges typed drafts over saved counts", () => {
    const items = [item({ first_count: 3 }), item({ uuid: "i-2" })];
    expect(phaseCounts(items, "first", { "i-2": "7" })).toEqual({ "i-1": 3, "i-2": 7 });
    expect(phaseCounts(items, "first", { "i-1": "" })).toEqual({ "i-1": null, "i-2": null });
  });

  it("blocks WHO sign-out on the count blocker", () => {
    const safety = { sign_in: true, time_out: true, sign_out: true, pre_op_ready: true, count_blocker: "Confirm the final surgical count (two staff) first." };
    expect(safetyGateBlocker("sign_out", "recovery", safety, "elective")).toMatch(/final surgical count/);
    expect(safetyGateBlocker("sign_out", "recovery", { ...safety, count_blocker: "" }, "elective")).toBeNull();
  });
});

describe("tray, implant and recall helpers", () => {
  it("builds return issues per instrument", () => {
    const row = { set_items: [{ uuid: "a", name: "Kocher", quantity: 4 }, { uuid: "b", name: "Mayo", quantity: 2 }] } as TheatreCaseTray;
    expect(trayIssuesFromDraft(row, { a: { missing: "1", damaged: "" }, b: { missing: "0", damaged: "2" } })).toEqual([
      { set_item_uuid: "a", kind: "missing", quantity: 1 },
      { set_item_uuid: "b", kind: "damaged", quantity: 2 },
    ]);
  });

  it("only loads reprocessable trays of the steriliser's method", () => {
    const trays = [tray(), tray({ uuid: "t-2", status: "in_use" }), tray({ uuid: "t-3", method: "plasma" })];
    expect(loadableTrays(trays, "steam").map((row) => row.uuid)).toEqual(["t-1"]);
  });

  it("validates tray set drafts", () => {
    const base = { name: "Major", code: "MAJ", shelf_life_days: "30", items: [] };
    expect(traySetDraftProblem(base)).toBe("");
    expect(traySetDraftProblem({ ...base, code: "" })).toMatch(/code/);
    expect(traySetDraftProblem({ ...base, items: [{ key: "k", name: "", quantity: 1 }] })).toMatch(/name/);
  });

  it("warns on expired implants and missing lot / serial", () => {
    expect(implantDraftProblem({ lot_number: "L1", expiry_date: "2020-01-01" }, null, "2026-11-12")).toMatch(/expired/);
    expect(implantDraftProblem({}, null, "2026-11-12")).toMatch(/lot/);
    expect(implantDraftProblem({}, { batch_number: "B1", is_expired: true }, "2026-11-12")).toMatch(/B1/);
    expect(implantDraftProblem({ serial_number: "S1" }, null, "2026-11-12")).toBe("");
  });

  it("summarises implants for the op note", () => {
    const items = [
      { uuid: "1", kind: "implant", status: "issued", product_name: "Plate", manufacturer: "Acme", lot_number: "L7", serial_number: "", implant_site: "Tibia", implant_laterality: "left", expiry_date: "2027-01-01" },
      { uuid: "2", kind: "implant", status: "cancelled", product_name: "Screw" },
      { uuid: "3", kind: "consumable", status: "issued", product_name: "Suture" },
    ] as never[];
    const implants = caseImplants(items);
    expect(implants).toHaveLength(1);
    expect(implantSummary(implants[0])).toContain("Lot L7");
    expect(implantSummary(implants[0])).toContain("Tibia (left)");
  });

  it("needs at least one recall filter", () => {
    expect(recallFiltersEmpty({})).toBe(true);
    expect(cleanRecallFilters({ lot: "  L1 ", serial: " " })).toEqual({ lot: "L1" });
  });
});

describe("TheatreCountSheetPanel", () => {
  it("starts a count sheet", async () => {
    api.fetchTheatreCounts.mockResolvedValue({ sheet: null, blocker: "" } satisfies TheatreCountState);
    api.startTheatreCount.mockResolvedValue({ sheet: sheet({ confirmations: [] }), blocker: "" });
    wrap(<TheatreCountSheetPanel theatreCase={theatreCase()} canRecord canSign={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start count sheet" }));
    await waitFor(() => expect(api.startTheatreCount).toHaveBeenCalledWith("case-1"));
  });

  it("records then confirms a count with a second staff member", async () => {
    api.fetchTheatreCounts.mockResolvedValue({ sheet: sheet(), blocker: "Confirm the final surgical count (two staff) first." });
    api.fetchTheatreCountWitnesses.mockResolvedValue([{ id: 42, name: "Sr Banda", role: "nurse" }]);
    api.recordTheatreCounts.mockResolvedValue({ sheet: sheet(), blocker: "" });
    api.confirmTheatreCount.mockResolvedValue({ sheet: sheet(), blocker: "" });
    wrap(<TheatreCountSheetPanel theatreCase={theatreCase()} canRecord canSign={false} />);
    expect(await screen.findByTestId("theatre-count-blocker")).toHaveTextContent("final surgical count");
    fireEvent.click(screen.getByRole("button", { name: "First count" }));
    fireEvent.change(screen.getByLabelText("first count Raytec 10x10"), { target: { value: "15" } });
    await waitFor(() => expect(api.fetchTheatreCountWitnesses).toHaveBeenCalled());
    await pickOption(screen.getByRole("combobox", { name: "Second checker" }), "Sr Banda");
    fireEvent.click(screen.getByRole("button", { name: "Confirm count" }));
    await waitFor(() => expect(api.confirmTheatreCount).toHaveBeenCalled());
    expect(api.recordTheatreCounts).toHaveBeenCalledWith("case-1", "first", { "i-1": 15 });
    expect(api.confirmTheatreCount).toHaveBeenCalledWith("case-1", { phase: "first", witness_id: 42, notes: "" });
  });

  it("lets the surgeon sign a discrepancy only with search, x-ray and outcome", async () => {
    api.fetchTheatreCounts.mockResolvedValue({
      sheet: sheet({ status: "discrepancy", status_label: "Discrepancy", items: [item({ final_count: 14 })] }),
      blocker: "The final count does not match.",
    });
    api.resolveTheatreCount.mockResolvedValue({ sheet: sheet({ status: "resolved" }), blocker: "" });
    wrap(<TheatreCountSheetPanel theatreCase={theatreCase("sign_out")} canRecord canSign />);
    const sign = await screen.findByRole("button", { name: "Sign as surgeon" });
    expect(sign).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Search of the field/));
    await pickOption(screen.getByRole("combobox", { name: "X-ray" }), "Done - no item seen");
    fireEvent.change(screen.getByLabelText("Outcome"), { target: { value: "Swab found in bin" } });
    expect(sign).toBeEnabled();
    fireEvent.click(sign);
    await waitFor(() =>
      expect(api.resolveTheatreCount).toHaveBeenCalledWith("case-1", {
        search_performed: true,
        search_notes: "",
        xray: "negative",
        outcome: "Swab found in bin",
      }),
    );
  });

  it("asks for the surgeon when the user cannot sign", async () => {
    api.fetchTheatreCounts.mockResolvedValue({ sheet: sheet({ status: "discrepancy", status_label: "Discrepancy" }), blocker: "x" });
    wrap(<TheatreCountSheetPanel theatreCase={theatreCase("sign_out")} canRecord canSign={false} />);
    expect(await screen.findByText(/operating surgeon must document/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign as surgeon" })).toBeNull();
  });
});

describe("TheatreCaseTraysPanel", () => {
  it("assigns a tray by scanning its barcode", async () => {
    api.fetchTheatreCaseTrays.mockResolvedValue([]);
    api.assignTheatreTray.mockResolvedValue([]);
    wrap(<TheatreCaseTraysPanel theatreCase={theatreCase("pre_op")} canAssign />);
    fireEvent.change(await screen.findByLabelText("Scan tray barcode"), { target: { value: "TR-001" } });
    fireEvent.keyDown(screen.getByLabelText("Scan tray barcode"), { key: "Enter" });
    await waitFor(() => expect(api.assignTheatreTray).toHaveBeenCalledWith("case-1", { barcode: "TR-001" }));
  });
});

describe("TheatreImplantRecallPage", () => {
  it("is hidden without the capability", () => {
    wrap(<TheatreImplantRecallPage />);
    expect(screen.getByText(/do not have permission/)).toBeInTheDocument();
  });

  it("searches by lot and links the CSV export", async () => {
    capabilities.current = ["view_theatre_implant_recall"];
    api.fetchTheatreImplantRecall.mockResolvedValue({
      count: 1,
      truncated: false,
      patients: 1,
      results: [
        {
          uuid: "r1",
          case_uuid: "case-1",
          case_status: "completed",
          implanted_on: "2026-11-01",
          patient_uuid: "p1",
          patient_name: "Chikondi Banda",
          patient_identifier: "PT-001",
          patient_phone: "",
          product_uuid: "prod",
          product_name: "Locking plate",
          product_code: "LP",
          manufacturer: "Acme",
          lot_number: "L-77",
          serial_number: "",
          expiry_date: "",
          implant_site: "Tibia",
          implant_laterality: "left",
          inventory_batch_number: "",
          quantity: "1",
          status: "issued",
          status_label: "Issued",
          surgeon_name: "Dr Mwale",
          room_name: "Theatre 1",
          clinic_name: "Main",
        },
      ],
    });
    wrap(<TheatreImplantRecallPage />);
    fireEvent.change(screen.getByLabelText("Lot / batch"), { target: { value: " L-77 " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("Chikondi Banda")).toBeInTheDocument();
    expect(api.fetchTheatreImplantRecall).toHaveBeenCalledWith({ lot: "L-77" });
    expect(screen.getByTestId("theatre-implant-recall-summary")).toHaveTextContent("1 implant(s) in 1 patient(s)");
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      expect.stringContaining("/api/theatre/implants/recall/export?lot=L-77"),
    );
  });
});
