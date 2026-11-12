import { describe, expect, it } from "vitest";

import {
  BFF_CLINICAL_THEATRE_ROUTES,
  CLINICAL_THEATRE_API_PATHS,
} from "@/constants/clinical-theatre-api";
import {
  ALDRETE_DISCHARGE_THRESHOLD,
  aldreteTotal,
  areConsumablesEditable,
  dischargeStatusFor,
  formatMinutes,
  isAnaesthesiaEditable,
  isOperationNoteEditable,
  parseOptionalNumber,
  recoveryDischargeBlocker,
  theatreClinicOptions,
} from "@/features/clinical-theatre/utils/theatre-record-display";
import { buildTheatreQuery } from "@/lib/server/theatre-bff";

describe("theatre phase 3 API paths", () => {
  it("maps record endpoints to Django", () => {
    expect(CLINICAL_THEATRE_API_PATHS.anaesthesia("c1")).toBe(
      "/theatre/cases/c1/anaesthesia/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.operationNoteSign("c1")).toBe(
      "/theatre/cases/c1/operation-note/sign/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.recoveryDischarge("c1")).toBe(
      "/theatre/cases/c1/recovery/discharge/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.consumableIssue("c1", "i1")).toBe(
      "/theatre/cases/c1/consumables/i1/issue/",
    );
    expect(CLINICAL_THEATRE_API_PATHS.reportSummary).toBe("/theatre/reports/summary/");
    expect(BFF_CLINICAL_THEATRE_ROUTES.consumable("c1", "i1")).toBe(
      "/api/theatre/cases/c1/consumables/i1",
    );
    expect(BFF_CLINICAL_THEATRE_ROUTES.reportSummary).toBe("/api/theatre/reports/summary");
  });

  it("forwards report filters upstream", () => {
    const request = new Request(
      "http://app.localhost/api/theatre/reports/summary?date_from=2026-11-01&date_to=2026-11-12&session_hours=10&x=1",
    );
    expect(buildTheatreQuery(request)).toBe(
      "?date_from=2026-11-01&date_to=2026-11-12&session_hours=10",
    );
  });
});

describe("theatre record helpers", () => {
  it("knows when each record is editable", () => {
    expect(isAnaesthesiaEditable("pre_op", null)).toBe(true);
    expect(isAnaesthesiaEditable("recovery", "2026-11-12T10:00:00Z")).toBe(false);
    expect(isAnaesthesiaEditable("booked", null)).toBe(false);
    expect(isOperationNoteEditable("discharged_home", null)).toBe(true);
    expect(isOperationNoteEditable("pre_op", null)).toBe(false);
    expect(areConsumablesEditable("sign_out")).toBe(true);
    expect(areConsumablesEditable("discharged_ward")).toBe(false);
  });

  it("totals the Aldrete score", () => {
    expect(
      aldreteTotal({
        activity: 2,
        respiration: 2,
        circulation: 1,
        consciousness: 2,
        oxygen_saturation: 2,
      }),
    ).toBe(9);
    expect(aldreteTotal({})).toBe(0);
    expect(ALDRETE_DISCHARGE_THRESHOLD).toBe(9);
  });

  it("explains what blocks the recovery discharge", () => {
    expect(recoveryDischargeBlocker(null)).toMatch(/arrives in recovery/);
    const base = { handover_destination: "ward" as const, latest_aldrete: 10, discharged_at: null };
    expect(recoveryDischargeBlocker(base)).toBeNull();
    expect(recoveryDischargeBlocker({ ...base, handover_destination: "" })).toMatch(
      /destination/,
    );
    expect(recoveryDischargeBlocker({ ...base, latest_aldrete: null })).toMatch(
      /observation/,
    );
    expect(recoveryDischargeBlocker({ ...base, latest_aldrete: 7 })).toMatch(/is 7/);
  });

  it("maps handover destinations to discharge statuses", () => {
    expect(dischargeStatusFor("home")).toBe("discharged_home");
    expect(dischargeStatusFor("icu")).toBe("discharged_ward");
    expect(dischargeStatusFor("")).toBeNull();
  });

  it("formats durations and numbers", () => {
    expect(formatMinutes(96)).toBe("1 h 36 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(null)).toBe("—");
    expect(parseOptionalNumber("")).toBeNull();
    expect(parseOptionalNumber("12")).toBe(12);
    expect(parseOptionalNumber("abc")).toBeNull();
  });

  it("builds unique clinic options from rooms", () => {
    expect(
      theatreClinicOptions([
        { clinic_uuid: "b", clinic_name: "Zomba" },
        { clinic_uuid: "a", clinic_name: "Blantyre" },
        { clinic_uuid: "b", clinic_name: "Zomba" },
      ]),
    ).toEqual([
      { uuid: "a", name: "Blantyre" },
      { uuid: "b", name: "Zomba" },
    ]);
  });
});
