import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohDrugAlcohol;

export type DaRiskConfig = {
  enabled: boolean;
  weighted_draw: boolean;
  auto_propose: boolean;
  lookback_months: number;
  role_tiers: Record<string, number>;
  site_tiers: Record<string, number>;
  tier_weights: Record<string, number>;
  incident_weight: number;
  site_incident_weight: number;
  max_weight: number;
  base_drug_rate: number;
  base_alcohol_rate: number;
  min_drug_rate: number;
  max_drug_rate: number;
  min_alcohol_rate: number;
  max_alcohol_rate: number;
};

export type DaRateProposal = {
  uuid: string;
  pool_uuid: string | null;
  pool_name: string | null;
  status: "proposed" | "approved" | "rejected" | "superseded";
  current_drug_rate: number;
  current_alcohol_rate: number;
  proposed_drug_rate: number;
  proposed_alcohol_rate: number;
  basis: {
    population?: number;
    mean_weight?: number;
    tier_counts?: Record<string, number>;
    incidents?: number;
    workers_with_incidents?: number;
    sites_with_incidents?: number;
    lookback_months?: number;
  } | null;
  proposed_at: string | null;
  decided_at: string | null;
  decided_by_initials: string;
  decision_note: string;
};

export type DaRiskPool = {
  uuid: string;
  name: string;
  annual_drug_rate: number;
  annual_alcohol_rate: number;
  frequency: string;
  risk: DaRiskConfig;
  latest_proposal: DaRateProposal | null;
};

export type DaDrawCheck = {
  draw_uuid: string;
  algorithm: string;
  verifiable: boolean;
  checks: Record<string, boolean>;
  ok: boolean;
};

export type DaAnomaly = {
  uuid: string;
  dimension: "collector" | "site";
  subject: string;
  metric: string;
  events: number;
  total: number;
  rate: number;
  baseline_rate: number;
  z_score: number;
  p_value: number;
  window_from: string | null;
  window_to: string | null;
  status: "open" | "reviewed" | "dismissed";
  review_note: string;
  reviewed_by_initials: string;
  reviewed_at: string | null;
  detected_at: string | null;
};

type Results<T> = { results: T[] };

const get = <T>(path: string) => bffRequest<T>(`${BASE}/${path}`);
const post = <T>(path: string, body: object = {}) => bffRequest<T>(`${BASE}/${path}`, { method: "POST", body });

export const fetchDaRiskPools = () => get<Results<DaRiskPool>>("risk/pools").then((r) => r.results);
export const saveDaRiskConfig = (poolUuid: string, body: Partial<DaRiskConfig>) =>
  bffRequest<DaRiskPool>(`${BASE}/risk/pools/${poolUuid}`, { method: "PATCH", body });
export const proposeDaRates = (poolUuid: string) =>
  post<DaRateProposal | { message: string; proposal: null }>(`risk/pools/${poolUuid}/propose`);
export const fetchDaRateProposals = (status?: DaRateProposal["status"]) =>
  get<Results<DaRateProposal>>(`risk/proposals${status ? `?status=${status}` : ""}`).then((r) => r.results);
export const decideDaRateProposal = (uuid: string, decision: "approve" | "reject", note: string) =>
  post<DaRateProposal>(`risk/proposals/${uuid}/${decision}`, { note });
export const verifyDaDraw = (drawUuid: string) => get<DaDrawCheck>(`draws/${drawUuid}/verify`);

export const fetchDaAnomalies = (status?: DaAnomaly["status"]) =>
  get<Results<DaAnomaly>>(`anomalies${status ? `?status=${status}` : ""}`).then((r) => r.results);
export const scanDaAnomalies = (months = 6) => post<{ created: number; updated: number; checked: number }>("anomalies/scan", { months });
export const decideDaAnomaly = (uuid: string, action: "review" | "dismiss", note: string) =>
  post<DaAnomaly>(`anomalies/${uuid}/${action}`, { note });

export const ANOMALY_METRIC_LABEL: Record<string, string> = {
  dilute: "Dilute samples",
  invalid: "Invalid results",
  adulterated: "Tampered samples",
  refusal: "Refusals",
  shy: "Shy bladder or lung",
  cancelled: "Cancelled tests",
  late: "Late arrivals",
  off_hours: "Out-of-hours collections",
};

export const DRAW_CHECK_LABEL: Record<string, string> = {
  seed_commitment: "Seed matches what was locked in before the draw",
  population_hash: "Same list of workers",
  weights_hash: "Same risk weights",
  selection_matches: "Same people picked when re-run",
};

/** "Blaster = 3" lines <-> {blaster: 3}. */
export function tiersToText(map: Record<string, number>): string {
  return Object.entries(map)
    .map(([name, tier]) => `${name} = ${tier}`)
    .join("\n");
}

export function textToTiers(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const [rawName, rawTier] = line.split("=");
    const name = (rawName ?? "").trim();
    const tier = Number((rawTier ?? "").trim());
    if (name && Number.isInteger(tier) && tier >= 1 && tier <= 3) out[name] = tier;
  }
  return out;
}

export const pct = (value: number) => `${Math.round(value * 1000) / 10}%`;
