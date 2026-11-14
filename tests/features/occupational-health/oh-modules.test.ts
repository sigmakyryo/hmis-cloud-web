import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";
import {
  buildOhModules,
  findOhModuleBySlug,
  findOhPage,
  groupOhPages,
  resolveOhLocation,
} from "@/features/occupational-health/lib/oh-modules";

const modules = buildOhModules(["OccupationalHealth"], { enabledModules: ["OccupationalHealth"] });

describe("buildOhModules", () => {
  it("lists the six OH modules with described pages, queue first", () => {
    expect(modules.map((module) => module.slug)).toEqual([
      "clinic",
      "immunizations",
      "drug-alcohol",
      "fitness",
      "health-programs",
      "exposure-management",
    ]);
    expect(modules[0].pages[0]).toMatchObject({ name: "OHS Queue", href: ROUTES.occupationalHealth });
    expect(modules.every((module) => module.pages.every((page) => page.description.length > 0))).toBe(true);
  });

  it("returns nothing without OH access", () => {
    expect(buildOhModules(["Registration"], { enabledModules: ["Registration"] })).toEqual([]);
  });

  it("groups pages by purpose in a fixed order, skipping empty groups", () => {
    const healthPrograms = findOhModuleBySlug(modules, "health-programs");

    const groups = groupOhPages(healthPrograms?.pages ?? []);

    expect(groups.map(({ group }) => group)).toEqual(["daily", "programs", "records", "oversight"]);
    expect(groups[1].pages.map((page) => page.name)).toEqual([
      "Hearing",
      "Lung function",
      "Vision",
      "Ergonomics",
      "Fatigue",
    ]);
    expect(groupOhPages(findOhModuleBySlug(modules, "fitness")?.pages ?? []).map(({ group }) => group)).toEqual([
      "daily",
      "records",
    ]);
  });

  it("finds a page and its module by href", () => {
    expect(findOhPage(modules, ROUTES.fitnessTraining)?.module.slug).toBe("fitness");
    expect(findOhPage(modules, "/nowhere")).toBeNull();
  });

  it("homes the exposure pages, with the biological incidents among them", () => {
    const exposure = findOhModuleBySlug(modules, "exposure-management");
    expect(exposure?.pages.map((page) => page.href)).toContain(ROUTES.exposureManagementIncidents);
    expect(findOhPage(modules, ROUTES.exposureManagementEvents)?.module.slug).toBe("exposure-management");
    expect(findOhPage(modules, ROUTES.immunizationsExposures)).toBeNull();
  });

  it("finds a module by slug", () => {
    expect(findOhModuleBySlug(modules, "fitness")?.label).toBe("Fitness");
    expect(findOhModuleBySlug(modules, "nope")).toBeUndefined();
  });
});

describe("resolveOhLocation", () => {
  it.each([
    [ROUTES.occupationalHealth, "clinic", "OHS Queue"],
    [ROUTES.occupationalHealthEmployee("worker-1"), "clinic", "Employees"],
    [ROUTES.drugAlcoholMro, "drug-alcohol", "MRO review"],
    [ROUTES.immunizationsDue, "immunizations", "Due"],
    [ROUTES.healthProgramsLung, "health-programs", "Lung function"],
  ])("places %s in %s / %s", (pathname, slug, pageName) => {
    const location = resolveOhLocation(pathname, modules);

    expect(location?.module.slug).toBe(slug);
    expect(location?.page?.name).toBe(pageName);
  });

  it("keeps unlisted OH pages in the clinic module without an active page", () => {
    const location = resolveOhLocation("/occupational-health/recalls", modules);

    expect(location?.module.slug).toBe("clinic");
    expect(location?.page).toBeNull();
  });

  it.each([
    ROUTES.occupationalHealthHome,
    ROUTES.occupationalHealthForms,
    ROUTES.occupationalHealthEncounter(
      "f0f3038b-7950-5bc3-a679-f25d25a44061",
      "8600c21c-e2d9-5a65-bd42-5087c02bcde4",
    ),
    ROUTES.customers,
  ])("hides the module bar on %s", (pathname) => {
    expect(resolveOhLocation(pathname, modules)).toBeNull();
  });
});
