import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";
import {
  moduleDisplayNames,
  navigation,
} from "@/features/app-shell/constants/navigation-config";

describe("OHS navigation", () => {
  it("renames the OH module group and items to OHS without nested Immunizations", () => {
    expect(moduleDisplayNames.OccupationalHealth).toBe("OHS");
    expect(moduleDisplayNames.Immunizations).toBe("Immunizations");

    const ohItems = navigation.filter(
      (item) => item.moduleName === "OccupationalHealth",
    );
    expect(ohItems.map((item) => item.name)).toEqual([
      "OHS Queue",
      "Employees",
      "Injuries on duty",
      "Employer portal",
      "OHS Compliance",
      "OHS Surveillance",
      "OHS Audit trail",
      "OHS Privacy",
      "OHS Annual report",
    ]);
    expect(ohItems.map((item) => item.href)).toEqual([
      ROUTES.occupationalHealth,
      ROUTES.occupationalHealthEmployees,
      ROUTES.occupationalHealthInjuries,
      ROUTES.occupationalHealthEmployerPortal,
      ROUTES.occupationalHealthCompliance,
      ROUTES.occupationalHealthSurveillance,
      ROUTES.occupationalHealthAudit,
      ROUTES.occupationalHealthPrivacy,
      ROUTES.occupationalHealthAnnualReport,
    ]);
  });

  it("lists Immunizations as its own sidebar module with sub-pages", () => {
    const imm = navigation.filter((item) => item.moduleName === "Immunizations");
    expect(imm.map((item) => item.name)).toEqual([
      "Due",
      "Vaccines & lots",
      "Schedules",
      "Compliance",
      "Risk & tasks",
      "Exposures",
      "Governance",
      "PDCA",
      "Exports & audit",
    ]);
    expect(imm.every((item) => item.requiredGroup === "OccupationalHealth")).toBe(
      true,
    );
    expect(imm.map((item) => item.href)).toEqual([
      ROUTES.immunizationsDue,
      ROUTES.immunizationsVaccines,
      ROUTES.immunizationsSchedules,
      ROUTES.immunizationsCompliance,
      ROUTES.immunizationsRisk,
      ROUTES.immunizationsExposures,
      ROUTES.immunizationsGovernance,
      ROUTES.immunizationsPdca,
      ROUTES.immunizationsExports,
    ]);
  });
});

describe("Drug & Alcohol navigation", () => {
  it("lists Drug & Alcohol as its own sidebar module gated by the OccupationalHealth group", () => {
    expect(moduleDisplayNames.DrugAlcohol).toBe("Drug & Alcohol");
    const da = navigation.filter((item) => item.moduleName === "DrugAlcohol");
    expect(da.map((item) => item.name)).toEqual([
      "Due",
      "Cases",
      "MRO review",
      "Random pools",
      "Risk & rates",
      "Anomalies",
      "Wellbeing",
      "Return to duty",
      "Policies",
      "Reports",
      "Audit",
    ]);
    expect(da.every((item) => item.requiredGroup === "OccupationalHealth")).toBe(true);
    expect(da.every((item) => item.href.startsWith("/drug-alcohol/"))).toBe(true);
    expect(ROUTES.drugAlcoholDue).toBe("/drug-alcohol/due");
  });
});

describe("Immunizations routes", () => {
  it("exposes top-level immunizations routes and keeps legacy OH path", () => {
    expect(ROUTES.immunizationsDue).toBe("/immunizations/due");
    expect(ROUTES.immunizationsRisk).toBe("/immunizations/risk");
    expect(ROUTES.occupationalHealthImmunizations).toBe(
      "/occupational-health/immunizations",
    );
  });
});
