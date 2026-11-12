import { describe, expect, it } from "vitest";

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import { OPD_WORKSPACE_CONFIG } from "@/features/clinical-opd/config/opd-workspace.config";
import { OPD_WORKSPACE_ROUTING } from "@/features/clinical-opd/constants/opd-workspace-routing";
import { buildVisitTheatreBooking } from "@/features/clinical-theatre/components/TheatreBookFromVisitPanel";
import { shiftDateInput } from "@/features/clinical-theatre/pages/TheatreBoardPage";
import {
  requiredChecklistStage,
  safetyGateBlocker,
} from "@/features/clinical-theatre/utils/theatre-safety-display";

const NONE = { sign_in: false, time_out: false, sign_out: false, pre_op_ready: false };

describe("theatre phase 2 API paths", () => {
  it("maps board, team, checklist and pre-op routes", () => {
    expect(CLINICAL_THEATRE_API_PATHS.board).toBe("/theatre/board/");
    expect(CLINICAL_THEATRE_API_PATHS.team("c1")).toBe("/theatre/cases/c1/team/");
    expect(CLINICAL_THEATRE_API_PATHS.teamMember("c1", "m1")).toBe(
      "/theatre/cases/c1/team/m1/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.checklistStage("c1", "sign_in")).toBe(
      "/theatre/cases/c1/checklist/sign_in/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.preOp("c1")).toBe("/theatre/cases/c1/pre-op/");
    expect(BFF_CLINICAL_THEATRE_ROUTES.board).toBe("/api/theatre/board");
    expect(BFF_CLINICAL_THEATRE_ROUTES.checklist("c1")).toBe(
      "/api/theatre/cases/c1/checklist",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.preOp("c1")).toBe("/api/theatre/cases/c1/pre-op");
  });
});

describe("WHO checklist gates", () => {
  it("maps each gated move to its stage", () => {
    expect(requiredChecklistStage("pre_op", "in_theatre")).toBe("sign_in");
    expect(requiredChecklistStage("in_theatre", "sign_out")).toBe("time_out");
    expect(requiredChecklistStage("sign_out", "recovery")).toBe("sign_out");
    expect(requiredChecklistStage("waiting", "pre_op")).toBeNull();
    expect(requiredChecklistStage("pre_op", "cancelled")).toBeNull();
  });

  it("blocks entry to theatre until sign in and pre-op are done", () => {
    expect(safetyGateBlocker("pre_op", "in_theatre", NONE, "elective")).toMatch(
      /sign in/,
    );
    const signedIn = { ...NONE, sign_in: true };
    expect(safetyGateBlocker("pre_op", "in_theatre", signedIn, "elective")).toMatch(
      /pre-op/,
    );
    expect(safetyGateBlocker("pre_op", "in_theatre", signedIn, "emergency")).toBeNull();
    expect(
      safetyGateBlocker("pre_op", "in_theatre", { ...signedIn, pre_op_ready: true }, "elective"),
    ).toBeNull();
    expect(safetyGateBlocker("pre_op", "cancelled", NONE, "elective")).toBeNull();
  });
});

describe("OPD book theatre", () => {
  it("adds a Book theatre menu tab with a panel", () => {
    const tab = OPD_WORKSPACE_ROUTING.tabs.find((item) => item.id === "theatre");
    expect(tab?.surface).toBe("menu");
    expect(tab?.requiredCapability).toBe("book_theatre_case");
    expect(OPD_WORKSPACE_CONFIG.panels.theatre).toBeTruthy();
  });

  it("builds an existing-visit booking payload", () => {
    const payload = buildVisitTheatreBooking({
      visitUuid: "visit-1",
      room: {
        uuid: "room-1",
      } as Parameters<typeof buildVisitTheatreBooking>[0]["room"],
      urgency: "elective",
      start: "2026-11-13T08:00",
      end: "",
      description: "  Hernia repair ",
      surgeonId: 7,
      createAppointment: true,
    });
    expect(payload).toMatchObject({
      source: "existing_visit",
      visit: "visit-1",
      room: "room-1",
      scheduled_end: null,
      procedure_description: "Hernia repair",
      lead_surgeon: 7,
      create_appointment: true,
    });
    expect(payload.scheduled_start).toMatch(/^2026-11-1[23]T/);
  });
});

describe("theatre board date picker", () => {
  it("shifts dates across month ends", () => {
    expect(shiftDateInput("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftDateInput("2026-03-01", -1)).toBe("2026-02-28");
  });
});
