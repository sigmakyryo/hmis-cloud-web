import {
  Armchair,
  BadgeCheck,
  Building2,
  BriefcaseMedical,
  CalendarClock,
  CalendarRange,
  ChartPie,
  ClipboardList,
  Ear,
  Eye,
  FileDown,
  FileText,
  FlaskConical,
  Gauge,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  History,
  Landmark,
  ListChecks,
  MoonStar,
  Package,
  Plug,
  Radar,
  RefreshCcw,
  RotateCcw,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  Shuffle,
  Siren,
  Syringe,
  TestTubes,
  Microscope,
  TrendingUp,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { createElement, type ReactElement } from "react";

import { ROUTES } from "@/constants/routes";
import type { OhFamilyModule } from "@/features/app-shell/constants/navigation-config";

export const OH_MODULE_ICON: Record<OhFamilyModule, LucideIcon> = {
  OccupationalHealth: BriefcaseMedical,
  Immunizations: Syringe,
  DrugAlcohol: FlaskConical,
  Fitness: BadgeCheck,
  HealthPrograms: HeartPulse,
  ExposureManagement: Gauge,
};

const PAGE_ICON: Record<string, LucideIcon> = {
  [ROUTES.occupationalHealth]: ListChecks,
  [ROUTES.occupationalHealthEmployees]: Users,
  [ROUTES.occupationalHealthEmployerPortal]: Building2,
  [ROUTES.occupationalHealthCompliance]: ShieldCheck,
  [ROUTES.occupationalHealthSurveillance]: Radar,
  [ROUTES.immunizationsDue]: CalendarClock,
  [ROUTES.immunizationsRisk]: ClipboardList,
  [ROUTES.exposureManagement]: Gauge,
  [ROUTES.exposureManagementEvents]: Siren,
  [ROUTES.exposureManagementGroups]: Users,
  [ROUTES.exposureManagementMeasurements]: TestTubes,
  [ROUTES.exposureManagementAgents]: FlaskConical,
  [ROUTES.exposureManagementSampling]: CalendarClock,
  [ROUTES.exposureManagementIncidents]: Syringe,
  [ROUTES.exposureManagementReports]: FileDown,
  [ROUTES.immunizationsVaccines]: Package,
  [ROUTES.immunizationsSchedules]: CalendarRange,
  [ROUTES.immunizationsGovernance]: Landmark,
  [ROUTES.immunizationsCompliance]: ChartPie,
  [ROUTES.immunizationsPdca]: RefreshCcw,
  [ROUTES.immunizationsExports]: FileDown,
  [ROUTES.drugAlcoholDue]: CalendarClock,
  [ROUTES.drugAlcoholTests]: TestTubes,
  [ROUTES.drugAlcoholMro]: Microscope,
  [ROUTES.drugAlcoholRtd]: RotateCcw,
  [ROUTES.drugAlcoholWellbeing]: HeartHandshake,
  [ROUTES.drugAlcoholRandom]: Shuffle,
  [ROUTES.drugAlcoholPolicies]: ScrollText,
  [ROUTES.drugAlcoholRisk]: TrendingUp,
  [ROUTES.drugAlcoholAnomalies]: ScanSearch,
  [ROUTES.drugAlcoholReports]: FileText,
  [ROUTES.drugAlcoholAudit]: History,
  [ROUTES.fitnessBoard]: Gauge,
  [ROUTES.fitnessTraining]: GraduationCap,
  [ROUTES.fitnessIntegrations]: Plug,
  [ROUTES.healthProgramsDue]: CalendarClock,
  [ROUTES.healthProgramsHearing]: Ear,
  [ROUTES.healthProgramsLung]: Wind,
  [ROUTES.healthProgramsVision]: Eye,
  [ROUTES.healthProgramsErgonomics]: Armchair,
  [ROUTES.healthProgramsFatigue]: MoonStar,
  [ROUTES.healthProgramsPolicies]: ScrollText,
  [ROUTES.healthProgramsReports]: FileText,
};

export function ohPageIcon(href: string, ohModule: OhFamilyModule): LucideIcon {
  return PAGE_ICON[href] ?? OH_MODULE_ICON[ohModule];
}

/** The page's icon, falling back to its module icon. */
export function OhPageGlyph({
  href,
  ohModule,
  className,
}: {
  href: string;
  ohModule: OhFamilyModule;
  className?: string;
}): ReactElement {
  return createElement(ohPageIcon(href, ohModule), { className, "aria-hidden": true });
}

/**
 * Each module's own colour: `icon` for glyphs, `rule` for the selected marker,
 * `tint` for the soft square behind a section icon, and `chart` for its bars.
 */
export const OH_MODULE_ACCENT: Record<OhFamilyModule, { icon: string; rule: string; tint: string; chart: string }> = {
  OccupationalHealth: { icon: "text-brand-primary", rule: "border-brand-primary", tint: "bg-brand-tint", chart: "bg-brand-primary" },
  Immunizations: { icon: "text-sky-700", rule: "border-sky-600", tint: "bg-sky-50", chart: "bg-sky-600" },
  DrugAlcohol: { icon: "text-violet-700", rule: "border-violet-600", tint: "bg-violet-50", chart: "bg-violet-500" },
  Fitness: { icon: "text-emerald-700", rule: "border-emerald-600", tint: "bg-emerald-50", chart: "bg-emerald-600" },
  HealthPrograms: { icon: "text-rose-700", rule: "border-rose-600", tint: "bg-rose-50", chart: "bg-rose-500" },
  ExposureManagement: { icon: "text-amber-700", rule: "border-amber-600", tint: "bg-amber-50", chart: "bg-amber-500" },
};
