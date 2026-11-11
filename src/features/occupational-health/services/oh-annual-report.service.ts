import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type AnnualAudience = "employer" | "regulator";
export type AnnualReport = {
  year: number;
  audience: AnnualAudience;
  employer: { uuid: string; name: string } | null;
  generated_at: string;
  suppression: string | null;
  sections: Record<string, Record<string, number | string>>;
};
export type AnnualParams = { year: number; employer_uuid?: string; audience?: AnnualAudience };

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
const qs = (p: AnnualParams) =>
  new URLSearchParams(
    Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export const fetchAnnualReport = (p: AnnualParams) => bffRequest<AnnualReport>(`${BASE}/annual?${qs(p)}`);
export const annualReportFileUrl = (p: AnnualParams, format: "pdf" | "csv") => `${BASE}/annual/${format}?${qs(p)}`;

const PORTAL = BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortal;
export const fetchPortalAnnualSummary = (year: number) => bffRequest<AnnualReport>(`${PORTAL}/annual-summary?year=${year}`);
export const portalAnnualFileUrl = (year: number, format: "pdf" | "csv") => `${PORTAL}/annual-summary/${format}?year=${year}`;
