import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type AnnualAudience = "employer" | "regulator";
export type AnnualReport = {
  year: number;
  /** Present from the OHS that supports custom periods. */
  period?: { from: string; to: string; custom: boolean; label: string };
  audience: AnnualAudience;
  employer: { uuid: string; name: string } | null;
  generated_at: string;
  suppression: string | null;
  sections: Record<string, Record<string, number | string>>;
};
export type AnnualParams = {
  year: number;
  employer_uuid?: string;
  audience?: AnnualAudience;
  /** Custom period (both ends, YYYY-MM-DD); replaces the calendar year when set. */
  from?: string;
  to?: string;
};

/** One year of headline measures; suppressed employer counts arrive as "<5". */
export type AnnualTrendPoint = {
  year: number;
  workers: number | string;
  examinations: number | string;
  certificates: number | string;
  surveillance_completion: number | null;
  iod_cases: number | string;
  days_lost: number | string;
  sick_leave_days: number | string;
  da_tests: number | string;
};
export type AnnualTrend = { audience: AnnualAudience; employer: { uuid: string; name: string } | null; series: AnnualTrendPoint[] };

export const ANNUAL_SECTION_LABEL: Record<string, string> = {
  workforce: "Workforce",
  medicals: "Medicals",
  fitness: "Fitness for work",
  surveillance: "Medical surveillance",
  injuries: "Injury on duty",
  sick_leave: "Sick leave",
  health_programmes: "Health programmes",
  drug_alcohol: "Drug & alcohol",
  immunisation: "Immunisation",
};

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohAnnualReports;
/** Year or custom period query; a custom period drops the year so OHS uses from/to. */
const qs = (p: Partial<AnnualParams> & { years?: number }) =>
  new URLSearchParams(
    Object.entries(p)
      .filter(([k, v]) => v !== undefined && v !== "" && !(k === "year" && p.from && p.to))
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export const fetchAnnualReport = (p: AnnualParams) => bffRequest<AnnualReport>(`${BASE}/annual?${qs(p)}`);
export const annualReportFileUrl = (p: AnnualParams, format: "pdf" | "csv") => `${BASE}/annual/${format}?${qs(p)}`;
export const fetchAnnualTrend = (p: { employer_uuid?: string; audience?: AnnualAudience; years?: number }) =>
  bffRequest<AnnualTrend>(`${BASE}/annual/trend?${qs(p)}`);

const PORTAL = BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortal;
export const fetchPortalAnnualSummary = (year: number) => bffRequest<AnnualReport>(`${PORTAL}/annual-summary?year=${year}`);
export const portalAnnualFileUrl = (year: number, format: "pdf" | "csv") => `${PORTAL}/annual-summary/${format}?year=${year}`;
