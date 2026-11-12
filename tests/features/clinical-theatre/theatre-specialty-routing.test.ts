import { describe, expect, it } from "vitest";

import { buildSidebarNavItems } from "@/features/app-shell/utils/build-sidebar-nav";
import { resolvePortalModuleForPath } from "@/features/app-shell/utils/module-entitlements";
import { THEATRE_WORKSPACE_ROUTING } from "@/features/clinical-theatre/constants/theatre-workspace-routing";
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

  it("gives every workspace tab a panel and keeps disposition out", () => {
    const tabIds = THEATRE_WORKSPACE_ROUTING.tabs.map((tab) => tab.id);
    expect(tabIds).toContain("case");
    expect(tabIds).toEqual(expect.arrayContaining(["pre-op", "checklist", "team"]));
    expect(tabIds).not.toContain("disposition" as never);
    for (const id of tabIds) {
      expect(THEATRE_WORKSPACE_CONFIG.panels[id]).toBeTruthy();
    }
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
      "manage_theatre_rooms",
      "manage_theatre_team",
      "record_theatre_checklist",
      "record_theatre_pre_op",
      "transition_theatre_case",
      "view_theatre_board",
      "view_theatre_queue",
    ]);
  });
});
