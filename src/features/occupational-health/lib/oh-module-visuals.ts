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
