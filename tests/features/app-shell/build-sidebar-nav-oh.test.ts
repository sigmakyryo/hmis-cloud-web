import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";
import { buildCommandPaletteItems } from "@/features/app-shell/utils/build-command-palette-items";
import { buildSidebarNavItems } from "@/features/app-shell/utils/build-sidebar-nav";

const OH_GROUPS = ["OccupationalHealth"];
const ENABLED = ["OccupationalHealth"];

function build(pathname: string, groups = OH_GROUPS) {
  return buildSidebarNavItems(groups, pathname, false, false, ENABLED);
}

describe("buildSidebarNavItems occupational health", () => {
  it("collapses every OH-family module into one flat link to the OH home", () => {
    const items = build(ROUTES.overview);
    const titles = items.map((item) => item.title);
    const oh = items.find((item) => item.title === "Occupational Health");

    expect(oh).toMatchObject({ url: ROUTES.occupationalHealthHome, flat: true, isActive: false });
    for (const hidden of ["OHS", "Immunizations", "Drug & Alcohol", "Fitness", "Health programs"]) {
      expect(titles).not.toContain(hidden);
    }
    expect(oh?.items?.map((item) => item.url)).toEqual(
      expect.arrayContaining([ROUTES.occupationalHealth, ROUTES.immunizationsDue, ROUTES.fitnessBoard]),
    );
  });

  it.each([
    ROUTES.occupationalHealthHome,
    ROUTES.occupationalHealth,
    ROUTES.occupationalHealthEmployee("abc"),
    ROUTES.drugAlcoholMro,
    ROUTES.healthProgramsHearing,
  ])("marks the OH link active on %s", (pathname) => {
    const oh = build(pathname).find((item) => item.title === "Occupational Health");

    expect(oh?.isActive).toBe(true);
  });

  it("leaves the OH link inactive on shared forms so only Forms is highlighted", () => {
    const items = build(ROUTES.occupationalHealthForms);

    expect(items.find((item) => item.title === "Occupational Health")?.isActive).toBe(false);
    expect(items.find((item) => item.title === "Forms")?.isActive).toBe(true);
  });

  it("drops a switched-off module and the injuries page from the OH links", () => {
    const items = buildSidebarNavItems(
      OH_GROUPS,
      ROUTES.overview,
      false,
      false,
      ENABLED,
      ["immunizations", "drug-alcohol", "health-programs", "injuries", "employment", "exposure"],
    );
    const urls = items.find((item) => item.title === "Occupational Health")?.items?.map((item) => item.url) ?? [];

    expect(urls).not.toContain(ROUTES.fitnessBoard);
    expect(urls).toContain(ROUTES.occupationalHealth);
    expect(urls).toContain(ROUTES.occupationalHealthInjuries);

    const withoutInjuries = buildSidebarNavItems(
      OH_GROUPS,
      ROUTES.overview,
      false,
      false,
      ENABLED,
      ["immunizations", "drug-alcohol", "health-programs", "fitness", "employment", "exposure"],
    );
    const injuryUrls =
      withoutInjuries.find((item) => item.title === "Occupational Health")?.items?.map((item) => item.url) ?? [];
    expect(injuryUrls).not.toContain(ROUTES.occupationalHealthInjuries);
    expect(injuryUrls).toContain(ROUTES.fitnessBoard);
  });

  it("omits the OH link for users without OH access", () => {
    const items = build(ROUTES.overview, ["Registration"]);

    expect(items.some((item) => item.title === "Occupational Health")).toBe(false);
  });

  it("shows Employers when only occupational health is enabled", () => {
    const employers = build(ROUTES.overview).find((item) => item.title === "Employers");

    expect(employers).toMatchObject({
      url: ROUTES.employers,
      flat: true,
      section: "account",
    });
    expect(employers?.url).not.toBe(ROUTES.occupationalHealthHome);
  });

  it("hides Employers when neither employers nor occupational health is enabled", () => {
    const items = buildSidebarNavItems(
      ["OccupationalHealth"],
      ROUTES.overview,
      false,
      false,
      ["Registration"],
    );

    expect(items.some((item) => item.title === "Employers")).toBe(false);
  });

  it("keeps every OH page reachable from the command palette", () => {
    const palette = buildCommandPaletteItems(build(ROUTES.overview));
    const ohEntries = palette.filter((item) => item.group === "Occupational Health");

    expect(ohEntries[0]).toMatchObject({ href: ROUTES.occupationalHealthHome, title: "All modules" });
    expect(ohEntries.map((item) => item.title)).toEqual(
      expect.arrayContaining(["OHS Queue", "Drug & Alcohol · MRO review", "Immunizations · Due"]),
    );
  });
});
