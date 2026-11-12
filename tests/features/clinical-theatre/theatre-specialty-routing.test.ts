import { describe, expect, it } from "vitest";

import { buildSidebarNavItems } from "@/features/app-shell/utils/build-sidebar-nav";
import { resolvePortalModuleForPath } from "@/features/app-shell/utils/module-entitlements";
import {
  THEATRE_WORKSPACE_ROUTING,
  theatreLegacySegmentHref,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import { THEATRE_WORKSPACE_CONFIG } from "@/features/clinical-theatre/config/theatre-workspace.config";
import {
  clinicalSpecialtyForDepartmentType,
  clinicalSpecialtyForPath,
  getClinicalSpecialty,
} from "@/features/clinical-workspace/constants/clinical-specialties";
import { clinicalEncounterLandingHref } from "@/features/visits/utils/clinical-encounter-links";
import { getModuleSettingsItemBySlug } from "@/features/settings/constants/module-settings-cards";
import { THEATRE_ROLE_CAPABILITIES } from "@/features/settings/constants/clinical-role-capability-config";

describe("theatre specialty routing", () => {
  it("registers the theatre specialty under /clinical/theatre", () => {
    const specialty = getClinicalSpecialty("theatre");
    expect(specialty.basePath).toBe("/clinical/theatre");
    expect(specialty.moduleName).toBe("Theatre");
    expect(specialty.accessGroup).toBe("Theatre");
    expect(specialty.procedureContext).toBe("theatre");
    expect(clinicalSpecialtyForDepartmentType("theatre")?.code).toBe("theatre");
    expect(clinicalSpecialtyForPath("/clinical/theatre/v1/e1/case")?.code).toBe(
      "theatre",
    );
  });

  it("maps theatre paths to the Theatre portal module", () => {
    expect(resolvePortalModuleForPath("/clinical/theatre")).toBe("Theatre");
    expect(resolvePortalModuleForPath("/settings/modules/theatre")).toBe("Theatre");
  });

  it("groups the workspace into stage sections and keeps disposition out", () => {
    const tabIds = THEATRE_WORKSPACE_ROUTING.tabs.map((tab) => tab.id);
    const barTabs = THEATRE_WORKSPACE_ROUTING.tabs
      .filter((tab) => tab.surface === "tab")
      .map((tab) => tab.label);
    expect(barTabs).toEqual(["Overview", "Pre-op", "Intra-op", "Recovery"]);
    expect(tabIds).toEqual(
      expect.arrayContaining(["case", "pre-op", "intra-op", "recovery", "activity", "nursing"]),
    );
    expect(tabIds).not.toContain("disposition" as never);
    for (const id of tabIds) {
      expect(THEATRE_WORKSPACE_CONFIG.panels[id]).toBeTruthy();
    }
    expect(THEATRE_WORKSPACE_CONFIG.workspaceBanner).toBeTruthy();
  });

  it("redirects the old per-record tab URLs into the grouped sections", () => {
    expect(theatreLegacySegmentHref("v1", "e1", "checklist")).toBe(
      "/clinical/theatre/v1/e1/pre-op",
    );
    expect(theatreLegacySegmentHref("v1", "e1", "team")).toBe("/clinical/theatre/v1/e1/case");
    expect(theatreLegacySegmentHref("v1", "e1", "op-note")).toBe(
      "/clinical/theatre/v1/e1/intra-op?section=op-note",
    );
    expect(theatreLegacySegmentHref("v1", "e1", "anaesthesia")).toBe(
      "/clinical/theatre/v1/e1/intra-op?section=anaesthesia",
    );
    expect(theatreLegacySegmentHref("v1", "e1", "consumables")).toBe(
      "/clinical/theatre/v1/e1/intra-op?section=consumables",
    );
  });

  it("builds encounter deep links for theatre departments", () => {
    const href = clinicalEncounterLandingHref(
      "theatre",
      "visit-uuid",
      "encounter-uuid",
      ["view_theatre_queue"],
      "nurse",
    );
    expect(href).toContain("/clinical/theatre/visit-uuid/encounter-uuid");
  });

  it("adds a Theatre Queue sidebar item for Theatre members", () => {
    const items = buildSidebarNavItems(
      ["Theatre"],
      "/clinical/theatre",
      false,
      false,
      ["Theatre"],
    );
    const urls = items.flatMap((item) => item.items?.map((child) => child.url) ?? []);
    expect(urls).toContain("/clinical/theatre");
    expect(urls).toContain("/clinical/theatre/board");
    expect(urls).toContain("/clinical/theatre/reports");
  });

  it("hides the Theatre Queue when the module is disabled", () => {
    const items = buildSidebarNavItems(
      ["Theatre"],
      "/clinical/theatre",
      false,
      false,
      ["Clinical"],
    );
    const urls = items.flatMap((item) => item.items?.map((child) => child.url) ?? []);
    expect(urls).not.toContain("/clinical/theatre");
  });

  it("exposes theatre module settings with all theatre capabilities", () => {
    const item = getModuleSettingsItemBySlug("theatre", ["Theatre"]);
    expect(item?.href).toBe("/settings/modules/theatre");
    expect(item?.hasSettings).toBe(true);
    expect(THEATRE_ROLE_CAPABILITIES.map((cap) => cap.key).sort()).toEqual([
      "book_theatre_case",
      "convert_theatre_case_to_ipd",
      "issue_theatre_consumables",
      "manage_theatre_cancellation_reasons",
      "manage_theatre_preference_cards",
      "manage_theatre_procedure_codes",
      "manage_theatre_rooms",
      "manage_theatre_team",
      "record_theatre_anaesthesia",
      "record_theatre_checklist",
      "record_theatre_consumables",
      "record_theatre_obstetrics",
      "record_theatre_operation_note",
      "record_theatre_pre_op",
      "record_theatre_recovery",
      "register_theatre_newborn",
      "return_theatre_consumables",
      "sign_theatre_operation_note",
      "start_theatre_crash_case",
      "transition_theatre_case",
      "view_theatre_board",
      "view_theatre_queue",
      "view_theatre_reports",
    ]);
  });
});
