import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";
import {
  moduleDisplayNames,
  navigation,
} from "@/features/app-shell/constants/navigation-config";

describe("OHS navigation", () => {
  it("renames the OH module group and items to OHS", () => {
    expect(moduleDisplayNames.OccupationalHealth).toBe("OHS");

    const ohItems = navigation.filter(
      (item) => item.moduleName === "OccupationalHealth",
    );
    expect(ohItems.map((item) => item.name)).toEqual([
      "OHS Queue",
      "Employees",
      "Immunizations",
      "Drug & alcohol",
      "OHS Compliance",
      "OHS Surveillance",
    ]);
    expect(ohItems.map((item) => item.href)).toEqual([
      ROUTES.occupationalHealth,
      ROUTES.occupationalHealthEmployees,
      ROUTES.occupationalHealthImmunizations,
      ROUTES.occupationalHealthDrugAlcohol,
      ROUTES.occupationalHealthCompliance,
      ROUTES.occupationalHealthSurveillance,
    ]);
  });
});
