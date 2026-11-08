import { describe, expect, it } from "vitest";

import { ROUTES } from "@/constants/routes";
import {
  buildSettingsNavigation,
  findActiveSettingsNavigationItem,
  isSettingsNavigationItemActive,
  resolveSettingsBreadcrumbLabel,
} from "@/features/settings/constants/settings-navigation-config";

describe("settings navigation config", () => {
  it("filters admin-only items for non-admins", () => {
    const categories = buildSettingsNavigation(false);
    const labels = categories.flatMap((category) =>
      category.items.map((item) => item.label),
    );

    expect(labels).toEqual(["Account", "Security"]);
  });

  it("includes admin settings for tenant admins", () => {
    const categories = buildSettingsNavigation(true);
    const labels = categories.flatMap((category) =>
      category.items.map((item) => item.label),
    );

    expect(labels).toEqual(
      expect.arrayContaining([
        "Organization",
        "Account",
        "Security",
        "User Management",
        "Visit Management",
        "Finance & Operations",
        "Modules",
        "Integrations",
      ]),
    );
  });

  it("matches integration child routes under Integrations", () => {
    const categories = buildSettingsNavigation(true);
    const integrations = categories
      .flatMap((category) => category.items)
      .find((item) => item.label === "Integrations");

    expect(integrations).toBeDefined();
    expect(
      isSettingsNavigationItemActive(
        ROUTES.settingsIntegrationsEmail,
        integrations!,
      ),
    ).toBe(true);
    expect(
      findActiveSettingsNavigationItem(
        ROUTES.settingsIntegrationsMasemEclaims,
        categories,
      )?.label,
    ).toBe("Integrations");
  });

  it("resolves breadcrumb labels for nested settings pages", () => {
    const categories = buildSettingsNavigation(true);

    expect(
      resolveSettingsBreadcrumbLabel(ROUTES.settingsAccount, categories),
    ).toBe("Account");
    expect(
      resolveSettingsBreadcrumbLabel(ROUTES.settingsModulePharmacy, categories),
    ).toBe("Pharmacy");
    expect(
      resolveSettingsBreadcrumbLabel(
        ROUTES.settingsIntegrationsMasemEclaims,
        categories,
      ),
    ).toBe("MASM eClaims");
  });

  it("keeps Modules active on an occupational health employer page", () => {
    const categories = buildSettingsNavigation(true);
    const employerPath = ROUTES.settingsOccupationalHealthEmployer(
      "890cc1e2-b0ec-4cdf-8745-9e5ad1ff09da",
    );

    expect(employerPath).toBe(
      "/settings/modules/occupational-health?employer=890cc1e2-b0ec-4cdf-8745-9e5ad1ff09da",
    );
    expect(
      ROUTES.settingsOccupationalHealthEmployer(
        "890cc1e2-b0ec-4cdf-8745-9e5ad1ff09da",
        "job-titles",
      ),
    ).toBe(
      "/settings/modules/occupational-health?employer=890cc1e2-b0ec-4cdf-8745-9e5ad1ff09da&section=job-titles",
    );
    expect(
      findActiveSettingsNavigationItem(
        "/settings/modules/occupational-health",
        categories,
      )?.label,
    ).toBe("Modules");
  });

  it("assigns icons to every settings nav item", () => {
    const categories = buildSettingsNavigation(true);
    const items = categories.flatMap((category) => category.items);

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => Boolean(item.icon))).toBe(true);
  });
});
