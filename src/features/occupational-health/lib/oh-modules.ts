import type { AppIconName } from "@/components/icons/app-icon";
import { ROUTES } from "@/constants/routes";
import {
  filterNavigation,
  isNavItemActive,
  OH_FAMILY_MODULES,
  type NavAccessOptions,
  type OhFamilyModule,
} from "@/features/app-shell/constants/navigation-config";

export type OhPageGroup = "daily" | "programs" | "records" | "oversight";

export const OH_PAGE_GROUP_ORDER: OhPageGroup[] = ["daily", "programs", "records", "oversight"];

export const OH_PAGE_GROUP_LABEL: Record<OhPageGroup, string> = {
  daily: "Daily work",
  programs: "Screening programmes",
  records: "Records & setup",
  oversight: "Oversight & reports",
};

export type OhModulePage = {
  name: string;
  href: string;
  description: string;
  group: OhPageGroup;
};

export type OhModule = {
  key: OhFamilyModule;
  slug: string;
  label: string;
  summary: string;
  icon: AppIconName;
  basePath: string;
  pages: OhModulePage[];
};

export type OhLocation = {
  module: OhModule;
  page: OhModulePage | null;
};

const MODULE_META: Record<
  OhFamilyModule,
  Pick<OhModule, "slug" | "label" | "summary" | "icon" | "basePath">
> = {
  OccupationalHealth: {
    slug: "clinic",
    label: "OHS clinic",
    summary: "Run the daily OH queue, manage employees and track compliance.",
    icon: "clipboard",
    basePath: ROUTES.occupationalHealth,
  },
  Immunizations: {
    slug: "immunizations",
    label: "Immunizations",
    summary: "Vaccines due, stock lots, schedules and exposure follow-up.",
    icon: "shield",
    basePath: ROUTES.immunizations,
  },
  DrugAlcohol: {
    slug: "drug-alcohol",
    label: "Drug & Alcohol",
    summary: "Testing cases, MRO review, random pools and return to duty.",
    icon: "flask",
    basePath: ROUTES.drugAlcohol,
  },
  Fitness: {
    slug: "fitness",
    label: "Fitness",
    summary: "Who is fit for work today, training on file and data feeds.",
    icon: "activity",
    basePath: ROUTES.fitness,
  },
  HealthPrograms: {
    slug: "health-programs",
    label: "Health programs",
    summary: "Hearing, lung, vision, ergonomics and fatigue surveillance.",
    icon: "heartPulse",
    basePath: ROUTES.healthPrograms,
  },
};

const PAGE_META: Record<string, { description: string; group: OhPageGroup }> = {
  [ROUTES.occupationalHealth]: { description: "Today's OH visits, waiting and in progress.", group: "daily" },
  [ROUTES.occupationalHealthEmployees]: {
    description: "Every worker on file with their employer and status.",
    group: "daily",
  },
  [ROUTES.occupationalHealthInjuries]: {
    description: "Workplace injuries and incidents on duty.",
    group: "records",
  },
  [ROUTES.occupationalHealthEmployerPortal]: {
    description: "What each employer sees in their portal.",
    group: "oversight",
  },
  [ROUTES.occupationalHealthCompliance]: {
    description: "Certificates, exams and checks that are overdue.",
    group: "oversight",
  },
  [ROUTES.occupationalHealthSurveillance]: {
    description: "Exposure groups and the medical surveillance they need.",
    group: "oversight",
  },
  [ROUTES.occupationalHealthAudit]: {
    description: "Who changed what, across every OH module (administrators).",
    group: "oversight",
  },
  [ROUTES.occupationalHealthPrivacy]: {
    description: "Consent records and data-subject requests (DPA 2024).",
    group: "oversight",
  },
  [ROUTES.occupationalHealthAnnualReport]: {
    description: "Yearly summary for an employer or the regulator (PDF / CSV).",
    group: "oversight",
  },
  [ROUTES.immunizationsDue]: { description: "Workers due or overdue for a dose.", group: "daily" },
  [ROUTES.immunizationsRisk]: { description: "Risk-based follow-up and assigned tasks.", group: "daily" },
  [ROUTES.immunizationsExposures]: { description: "Exposure incidents and post-exposure care.", group: "daily" },
  [ROUTES.immunizationsVaccines]: { description: "Vaccine catalogue, lots and expiry.", group: "records" },
  [ROUTES.immunizationsSchedules]: { description: "Dose schedules by vaccine and role.", group: "records" },
  [ROUTES.immunizationsGovernance]: { description: "Policies, sign-offs and declinations.", group: "records" },
  [ROUTES.immunizationsCompliance]: { description: "Coverage by employer, site and role.", group: "oversight" },
  [ROUTES.immunizationsPdca]: { description: "Plan, do, check, act improvement cycles.", group: "oversight" },
  [ROUTES.immunizationsExports]: { description: "Exports and the audit trail.", group: "oversight" },
  [ROUTES.drugAlcoholDue]: { description: "Workers due for a scheduled test.", group: "daily" },
  [ROUTES.drugAlcoholTests]: { description: "Every test case from collection to result.", group: "daily" },
  [ROUTES.drugAlcoholMro]: { description: "Non-negative results waiting for MRO review.", group: "daily" },
  [ROUTES.drugAlcoholRtd]: { description: "Return-to-duty and follow-up testing plans.", group: "daily" },
  [ROUTES.drugAlcoholWellbeing]: { description: "Support referrals and wellbeing follow-up.", group: "daily" },
  [ROUTES.drugAlcoholRandom]: { description: "Random selection pools and draws.", group: "records" },
  [ROUTES.drugAlcoholPolicies]: { description: "Testing policies by employer.", group: "records" },
  [ROUTES.drugAlcoholRisk]: { description: "Positive rates and risk by group.", group: "oversight" },
  [ROUTES.drugAlcoholAnomalies]: { description: "Unusual patterns worth a second look.", group: "oversight" },
  [ROUTES.drugAlcoholReports]: { description: "Programme reports for employers.", group: "oversight" },
  [ROUTES.drugAlcoholAudit]: { description: "Chain of custody and change history.", group: "oversight" },
  [ROUTES.fitnessBoard]: { description: "Fitness for work across every worker.", group: "daily" },
  [ROUTES.fitnessTraining]: { description: "Training and competence records.", group: "records" },
  [ROUTES.fitnessIntegrations]: { description: "Data feeds that keep fitness current.", group: "records" },
  [ROUTES.healthProgramsDue]: { description: "Programme tests that are due.", group: "daily" },
  [ROUTES.healthProgramsHearing]: { description: "Audiometry results and threshold shifts.", group: "programs" },
  [ROUTES.healthProgramsLung]: { description: "Spirometry results and trends.", group: "programs" },
  [ROUTES.healthProgramsVision]: { description: "Vision screening results.", group: "programs" },
  [ROUTES.healthProgramsErgonomics]: { description: "Ergonomic assessments.", group: "programs" },
  [ROUTES.healthProgramsFatigue]: { description: "Fatigue screening and risk.", group: "programs" },
  [ROUTES.healthProgramsPolicies]: { description: "Programme rules and intervals.", group: "records" },
  [ROUTES.healthProgramsReports]: { description: "Programme reports for employers.", group: "oversight" },
};

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** OH-family modules and pages the user can open, in sidebar order. */
export function buildOhModules(userGroups: string[], options: NavAccessOptions = {}): OhModule[] {
  const allowed = filterNavigation(userGroups, options);

  return OH_FAMILY_MODULES.flatMap((key) => {
    const pages = allowed
      .filter((item) => item.moduleName === key)
      .map((item) => ({
        name: item.name,
        href: item.href,
        description: PAGE_META[item.href]?.description ?? "",
        group: PAGE_META[item.href]?.group ?? "daily",
      }));
    return pages.length > 0 ? [{ key, ...MODULE_META[key], pages }] : [];
  });
}

/** Pages split into intent groups, in display order, skipping empty groups. */
export function groupOhPages(pages: OhModulePage[]): Array<{ group: OhPageGroup; pages: OhModulePage[] }> {
  return OH_PAGE_GROUP_ORDER.flatMap((group) => {
    const inGroup = pages.filter((page) => page.group === group);
    return inGroup.length > 0 ? [{ group, pages: inGroup }] : [];
  });
}

export function findOhModuleBySlug(modules: OhModule[], slug: string | null): OhModule | undefined {
  return modules.find((ohModule) => ohModule.slug === slug);
}

/** Look up an OH page and its module by href. */
export function findOhPage(
  modules: OhModule[],
  href: string,
): { module: OhModule; page: OhModulePage } | null {
  for (const ohModule of modules) {
    const page = ohModule.pages.find((item) => item.href === href);
    if (page) {
      return { module: ohModule, page };
    }
  }
  return null;
}

function pageMatches(pathname: string, href: string) {
  // Why: every OHS page sits under the queue path, so the queue only matches exactly.
  return href === ROUTES.occupationalHealth ? pathname === href : isNavItemActive(pathname, href);
}

/**
 * Which OH module and page the pathname belongs to. Returns null where the module bar
 * should not show: the OH home page, shared forms, and the full-screen visit workspace.
 */
export function resolveOhLocation(pathname: string, modules: OhModule[]): OhLocation | null {
  if (
    isNavItemActive(pathname, ROUTES.occupationalHealthHome) ||
    isNavItemActive(pathname, ROUTES.occupationalHealthForms)
  ) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "occupational-health" && segments[1] && UUID_SEGMENT.test(segments[1])) {
    return null;
  }

  let best: OhLocation | null = null;
  for (const ohModule of modules) {
    for (const page of ohModule.pages) {
      if (pageMatches(pathname, page.href) && (!best?.page || page.href.length > best.page.href.length)) {
        best = { module: ohModule, page };
      }
    }
  }
  if (best) {
    return best;
  }

  const owner = modules.find((ohModule) => isNavItemActive(pathname, ohModule.basePath));
  return owner ? { module: owner, page: null } : null;
}
