import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TheatreAnaesthesiaRecord,
  TheatreAnaesthesiaVital,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

const p4 = vi.hoisted(() => ({
  fetchTheatreCaseDevices: vi.fn(),
  reviewTheatreDeviceVitals: vi.fn(),
  fetchTheatreMonitorDevices: vi.fn(),
  saveTheatreMonitorDevice: vi.fn(),
  rotateTheatreMonitorDevice: vi.fn(),
  revokeTheatreMonitorDevice: vi.fn(),
  fetchTheatreFamilyBoard: vi.fn(),
  fetchTheatreFamilyCode: vi.fn(),
  fetchTheatreFamilyBoardLinks: vi.fn(),
  createTheatreFamilyBoardLink: vi.fn(),
  rotateTheatreFamilyBoardLink: vi.fn(),
  revokeTheatreFamilyBoardLink: vi.fn(),
}));

vi.mock("@/features/clinical-theatre/services/theatre-p4.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/clinical-theatre/services/theatre-p4.service")>();
  return {
    ...actual,
    ...Object.fromEntries(
      Object.entries(p4).map(([key, fn]) => [key, (...args: unknown[]) => fn(...args)]),
    ),
  };
});

const core = vi.hoisted(() => ({ fetchTheatreRooms: vi.fn() }));
vi.mock("@/features/clinical-theatre/services/clinical-theatre.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/clinical-theatre/services/clinical-theatre.service")>();
  return { ...actual, fetchTheatreRooms: (...args: unknown[]) => core.fetchTheatreRooms(...args) };
});

const planning = vi.hoisted(() => ({ fetchTheatreSettings: vi.fn(), updateTheatreSettings: vi.fn() }));
vi.mock("@/features/clinical-theatre/services/theatre-planning.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/clinical-theatre/services/theatre-planning.service")>();
  return {
    ...actual,
    fetchTheatreSettings: (...args: unknown[]) => planning.fetchTheatreSettings(...args),
    updateTheatreSettings: (...args: unknown[]) => planning.updateTheatreSettings(...args),
  };
});

const upstream = vi.hoisted(() => ({ hmisApiRequest: vi.fn() }));
vi.mock("@/lib/server/hmis-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/hmis-api")>();
  return { ...actual, hmisApiRequest: (...args: unknown[]) => upstream.hmisApiRequest(...args) };
});

const capabilities = { current: [] as string[] };
vi.mock("@/features/clinical-opd/hooks/use-clinical-opd", () => ({
  useMyClinicalCapabilities: () => ({ data: { capabilities: capabilities.current }, isLoading: false }),
}));

import { GET as publicBoardGET } from "@/app/api/public/theatre-board/[token]/route";
import {
  BFF_CLINICAL_THEATRE_ROUTES,
  BFF_PUBLIC_THEATRE_BOARD,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { APP_ROUTE_PREFIXES, PROTECTED_ROUTES, ROUTES } from "@/constants/routes";
import { TheatreFamilyKiosk } from "@/features/clinical-theatre/components/TheatreFamilyKiosk";
import { TheatreLiveVitalsPanel } from "@/features/clinical-theatre/components/TheatreLiveVitalsPanel";
import { TheatreMonitorsSettingsPanel } from "@/features/clinical-theatre/components/TheatreMonitorsSettingsPanel";
import { THEATRE_LIVE_POLL_MS } from "@/features/clinical-theatre/hooks/use-theatre-p4";
import { TheatreFamilyBoardPage } from "@/features/clinical-theatre/pages/TheatreFamilyBoardPage";
import {
  familyBoardUrl,
  formatLastSeen,
  isLiveChart,
  isPendingDeviceVital,
  vitalChartPoints,
} from "@/features/clinical-theatre/utils/theatre-p4-display";
import { THEATRE_ROLE_CAPABILITIES } from "@/features/settings/constants/clinical-role-capability-config";
import { HmisApiError } from "@/lib/server/hmis-api";
import { matchesRoute } from "@/lib/route-matching";
import { THEATRE_QUERY_KEYS } from "@/lib/server/theatre-bff";

const P4_CAPABILITIES = [
  "manage_theatre_devices",
  "validate_theatre_device_vitals",
  "view_theatre_family_board",
  "manage_theatre_family_board",
];

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde";

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function vital(overrides: Partial<TheatreAnaesthesiaVital> = {}): TheatreAnaesthesiaVital {
  return {
    uuid: "v1",
    recorded_at: "2026-11-13T08:00:00Z",
    heart_rate: 70,
    systolic_bp: 120,
    diastolic_bp: 75,
    spo2: 98,
    etco2: 35,
    respiratory_rate: 12,
    temperature_c: "36.5",
    notes: "",
    source: "device",
    device_name: "OT1 monitor",
    review_status: "pending",
    is_artefact: false,
    artefact_reasons: [],
    ...overrides,
  };
}

function record(vitals: TheatreAnaesthesiaVital[]): TheatreAnaesthesiaRecord {
  return {
    uuid: "r1",
    anaesthetist: null,
    anaesthetist_name: "",
    technique: "general",
    airway: "ett",
    airway_notes: "",
    agents: [],
    fluids: [],
    blood_products: [],
    events: [],
    estimated_blood_loss_ml: null,
    urine_output_ml: null,
    anaesthesia_start: null,
    induction_at: null,
    anaesthesia_end: null,
    notes: "",
    vitals,
    pending_device_vitals: vitals.filter(isPendingDeviceVital).length,
    signed_at: null,
    signed_by_name: "",
    updated_at: "2026-11-13T08:00:00Z",
  };
}

beforeEach(() => {
  capabilities.current = [];
  core.fetchTheatreRooms.mockResolvedValue([
    { uuid: "room-1", name: "OT 1", code: "OT1", clinic_uuid: "c1", clinic_name: "Main" },
  ]);
  p4.fetchTheatreCaseDevices.mockResolvedValue({
    room_name: "OT 1",
    server_time: new Date().toISOString(),
    devices: [
      { uuid: "d1", name: "OT1 monitor", status: "online", last_seen_at: new Date().toISOString(), last_error: "" },
    ],
  });
  planning.fetchTheatreSettings.mockResolvedValue({
    first_case_tolerance_minutes: 15,
    turnover_gap_cap_minutes: 60,
    clearance_validity_days: 90,
    family_board_code_mode: "tracking_code",
    family_board_digits: 3,
    family_board_title: "Theatre patient status",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("P4 helpers and configuration", () => {
  it("adds the four P4 capabilities to the theatre role matrix", () => {
    const keys = THEATRE_ROLE_CAPABILITIES.map((cap) => cap.key);
    for (const key of P4_CAPABILITIES) expect(keys).toContain(key);
  });

  it("maps BFF and upstream paths", () => {
    expect(CLINICAL_THEATRE_API_PATHS.monitorDeviceRotate("d1")).toBe("/theatre/monitor-devices/d1/rotate/");
    expect(CLINICAL_THEATRE_API_PATHS.anaesthesiaVitalsReview("c1")).toBe(
      "/theatre/cases/c1/anaesthesia/vitals/review/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.publicFamilyBoard("a/b")).toBe("/theatre/public/family-board/a%2Fb/");
    expect(BFF_CLINICAL_THEATRE_ROUTES.familyBoardLinkRevoke("l1")).toBe("/api/theatre/family-board/links/l1/revoke");
    expect(BFF_PUBLIC_THEATRE_BOARD("tok")).toBe("/api/public/theatre-board/tok");
    expect(THEATRE_QUERY_KEYS).toContain("include_revoked");
  });

  it("serves the kiosk on the app host without a login redirect", () => {
    const path = ROUTES.theatreFamilyKiosk(TOKEN);
    expect(matchesRoute(path, APP_ROUTE_PREFIXES)).toBe(true);
    expect(matchesRoute(path, PROTECTED_ROUTES)).toBe(false);
    expect(matchesRoute(ROUTES.clinicalTheatreFamilyBoard, PROTECTED_ROUTES)).toBe(true);
  });

  it("builds chart points without rejected readings, oldest first", () => {
    const points = vitalChartPoints([
      vital({ uuid: "b", recorded_at: "2026-11-13T08:05:00Z", heart_rate: 80 }),
      vital({ uuid: "a", recorded_at: "2026-11-13T08:00:00Z", heart_rate: 70 }),
      vital({ uuid: "c", recorded_at: "2026-11-13T08:10:00Z", heart_rate: 200, review_status: "rejected" }),
    ]);
    expect(points.map((point) => point.hr)).toEqual([70, 80]);
  });

  it("formats last seen, kiosk urls and the live window", () => {
    const now = Date.parse("2026-11-13T08:10:00Z");
    expect(formatLastSeen(null)).toBe("never");
    expect(formatLastSeen("2026-11-13T08:09:50Z", now)).toBe("10 s ago");
    expect(formatLastSeen("2026-11-13T08:05:00Z", now)).toBe("5 min ago");
    expect(familyBoardUrl("t0k", "https://app.example.com/")).toBe("https://app.example.com/theatre-board/t0k");
    expect(isLiveChart("in_theatre", null)).toBe(true);
    expect(isLiveChart("in_theatre", "2026-11-13T08:00:00Z")).toBe(false);
    expect(isLiveChart("discharged_ward", null)).toBe(false);
    expect(THEATRE_LIVE_POLL_MS).toBeGreaterThanOrEqual(10_000);
    expect(THEATRE_LIVE_POLL_MS).toBeLessThanOrEqual(15_000);
  });
});

describe("TheatreLiveVitalsPanel", () => {
  it("shows device status, source badges and blocks review without the capability", async () => {
    wrap(
      <TheatreLiveVitalsPanel
        caseUuid="case-1"
        record={record([vital(), vital({ uuid: "m1", source: "manual", review_status: "not_required" })])}
        live
        canValidate={false}
        editable
      />,
    );
    expect(await screen.findByText(/OT1 monitor: Online/)).toBeInTheDocument();
    expect(screen.getByTestId("theatre-live-indicator")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText(/1 monitor reading\(s\) awaiting review/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validate all unflagged" })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("validates clean readings and rejects selected ones with a reason", async () => {
    p4.reviewTheatreDeviceVitals.mockResolvedValue({ changed: 1 });
    wrap(
      <TheatreLiveVitalsPanel
        caseUuid="case-1"
        record={record([
          vital({ uuid: "v1" }),
          vital({ uuid: "v2", recorded_at: "2026-11-13T08:01:00Z", is_artefact: true, artefact_reasons: ["HR jump"] }),
        ])}
        live
        canValidate
        editable
      />,
    );
    expect(screen.getByText("Possible artefact")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Validate all unflagged" }));
    await waitFor(() =>
      expect(p4.reviewTheatreDeviceVitals).toHaveBeenCalledWith("case-1", {
        action: "validate",
        scope: "pending_clean",
      }),
    );
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    const reject = screen.getByRole("button", { name: "Reject selected" });
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for rejecting"), { target: { value: "probe off" } });
    fireEvent.click(reject);
    await waitFor(() =>
      expect(p4.reviewTheatreDeviceVitals).toHaveBeenLastCalledWith("case-1", {
        action: "reject",
        vital_ids: ["v2"],
        note: "probe off",
      }),
    );
  });

  it("falls back to manual entry guidance when no monitor is linked", async () => {
    p4.fetchTheatreCaseDevices.mockResolvedValue({ room_name: "OT 2", server_time: "", devices: [] });
    wrap(<TheatreLiveVitalsPanel caseUuid="case-1" record={record([])} live={false} canValidate editable />);
    expect(await screen.findByText(/No monitor linked to OT 2/)).toBeInTheDocument();
    expect(screen.getByText("No vitals recorded yet.")).toBeInTheDocument();
  });
});

describe("public family board BFF", () => {
  it("passes through only code and stage fields and marks the response noindex", async () => {
    upstream.hmisApiRequest.mockResolvedValue({
      title: "Theatre patient status",
      refresh_seconds: 30,
      generated_at: "2026-11-13T08:00:00Z",
      entries: [{ code: "K7MP2Q", stage: "in_theatre", stage_label: "In theatre", patient_name: "Leak" }],
      patient_count: 99,
    });
    const response = await publicBoardGET(new Request(`http://localhost/api/public/theatre-board/${TOKEN}`), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["entries", "generated_at", "refresh_seconds", "title"]);
    expect(body.entries).toEqual([{ code: "K7MP2Q", stage: "in_theatre", stage_label: "In theatre" }]);
    expect(JSON.stringify(body)).not.toContain("Leak");
    expect(upstream.hmisApiRequest.mock.calls[0][1]).not.toHaveProperty("token");
  });

  it("rejects malformed tokens without calling upstream and hides upstream errors", async () => {
    const bad = await publicBoardGET(new Request("http://localhost/x"), {
      params: Promise.resolve({ token: "../../etc" }),
    });
    expect(bad.status).toBe(404);
    expect(upstream.hmisApiRequest).not.toHaveBeenCalled();

    upstream.hmisApiRequest.mockRejectedValue(new HmisApiError("Not found.", 404));
    const revoked = await publicBoardGET(new Request("http://localhost/x"), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(revoked.status).toBe(404);
    expect(await revoked.json()).toEqual({ message: "Not found." });

    upstream.hmisApiRequest.mockRejectedValue(new HmisApiError("Throttled", 429));
    const limited = await publicBoardGET(new Request("http://localhost/x"), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(limited.status).toBe(429);
  });
});

describe("TheatreFamilyKiosk", () => {
  it("shows codes and stages in large type and refreshes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        title: "Surgery status",
        refresh_seconds: 30,
        generated_at: "",
        entries: [{ code: "K7MP2Q", stage: "in_recovery", stage_label: "In recovery" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TheatreFamilyKiosk token={TOKEN} />);
    expect(await screen.findByText("K7MP2Q")).toBeInTheDocument();
    expect(screen.getByText("In recovery")).toBeInTheDocument();
    expect(screen.getByText("Surgery status")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(`/api/public/theatre-board/${TOKEN}`, expect.objectContaining({ credentials: "omit" }));
    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it("explains an inactive link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    render(<TheatreFamilyKiosk token={TOKEN} />);
    expect(await screen.findByText(/link is not active/)).toBeInTheDocument();
  });
});

describe("TheatreMonitorsSettingsPanel", () => {
  it("registers a device and shows the secret only once", async () => {
    capabilities.current = ["manage_theatre_devices"];
    p4.fetchTheatreMonitorDevices.mockResolvedValue([]);
    p4.saveTheatreMonitorDevice.mockResolvedValue({
      uuid: "d1",
      name: "OT1 monitor",
      key_id: "tmd_abc",
      secret: "tms_secret_value",
      status: "never",
    });
    wrap(<TheatreMonitorsSettingsPanel />);
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "OT1 monitor" } });
    await screen.findByRole("option", { name: "OT 1" });
    fireEvent.change(screen.getByLabelText("Theatre room"), { target: { value: "room-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Register device" }));
    await waitFor(() =>
      expect(p4.saveTheatreMonitorDevice).toHaveBeenCalledWith(
        { name: "OT1 monitor", room_uuid: "room-1", notes: "", require_signature: false },
        undefined,
      ),
    );
    expect(await screen.findByText("tms_secret_value")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "I have stored the secret" }));
    expect(screen.queryByText("tms_secret_value")).toBeNull();
    expect(screen.getByText(/Manage family status board/)).toBeInTheDocument();
  });

  it("creates a kiosk link and shows its address once", async () => {
    capabilities.current = ["manage_theatre_family_board"];
    p4.fetchTheatreFamilyBoardLinks.mockResolvedValue([]);
    p4.createTheatreFamilyBoardLink.mockResolvedValue({
      uuid: "l1",
      label: "Lobby TV",
      token: TOKEN,
      token_hint: TOKEN.slice(-4),
    });
    wrap(<TheatreMonitorsSettingsPanel />);
    fireEvent.change(await screen.findByLabelText("Screen label"), { target: { value: "Lobby TV" } });
    fireEvent.click(screen.getByRole("button", { name: "Create link" }));
    await waitFor(() =>
      expect(p4.createTheatreFamilyBoardLink).toHaveBeenCalledWith({
        label: "Lobby TV",
        room_uuid: null,
        clinic_uuid: null,
      }),
    );
    expect(await screen.findByText(new RegExp(`/theatre-board/${TOKEN}`))).toBeInTheDocument();
    expect(screen.getByText(/need the “Manage theatre monitors” capability/)).toBeInTheDocument();
  });
});

describe("TheatreFamilyBoardPage", () => {
  it("is hidden without the capability", () => {
    wrap(<TheatreFamilyBoardPage />);
    expect(screen.getByText(/do not have permission/)).toBeInTheDocument();
    expect(p4.fetchTheatreFamilyBoard).not.toHaveBeenCalled();
  });

  it("lists patients for staff and prints a tracking card", async () => {
    capabilities.current = ["view_theatre_family_board"];
    p4.fetchTheatreFamilyBoard.mockResolvedValue({
      title: "Theatre patient status",
      code_mode: "tracking_code",
      refresh_seconds: 30,
      entries: [
        {
          code: "K7MP2Q",
          stage: "in_theatre",
          stage_label: "In theatre",
          case_uuid: "case-1",
          patient_name: "Ada Patient",
          patient_identifier: "MRN-1",
          room_name: "OT 1",
          tracking_code: "K7MP2Q",
          scheduled_start: null,
        },
      ],
    });
    p4.fetchTheatreFamilyCode.mockResolvedValue({
      tracking_code: "K7MP2Q",
      display_code: "K7MP2Q",
      code_mode: "tracking_code",
      title: "Theatre patient status",
    });
    wrap(<TheatreFamilyBoardPage />);
    expect(await screen.findByText("Ada Patient")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New code" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show / print" }));
    await waitFor(() => expect(p4.fetchTheatreFamilyCode).toHaveBeenCalledWith("case-1", false));
    const card = await screen.findByTestId("theatre-tracking-card");
    expect(card).toHaveTextContent("K7MP2Q");
  });
});
