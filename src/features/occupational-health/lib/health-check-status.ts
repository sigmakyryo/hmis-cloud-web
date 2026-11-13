import { HP_PROGRAMS, type HpProgram, type HpResult } from "@/features/occupational-health/services/health-programs.service";

export type HealthCheckStatus = "not_done" | "recorded" | "flagged" | "abnormal";

export function healthCheckStatus(result: HpResult | undefined): HealthCheckStatus {
  if (!result) return "not_done";
  if (result.outcome === "restricted" || result.outcome === "unfit") return "abnormal";
  const flags = result.computed?.flags ?? [];
  if (flags.length > 0 || result.referral) return "flagged";
  return "recorded";
}

export function latestHealthCheckByProgram(results: HpResult[]): Map<HpProgram, HpResult> {
  const map = new Map<HpProgram, HpResult>();
  const sorted = [...results].sort((a, b) => (b.performed_at ?? "").localeCompare(a.performed_at ?? ""));
  for (const row of sorted) {
    if (!map.has(row.program)) map.set(row.program, row);
  }
  return map;
}

export function summarizeHealthChecks(results: HpResult[]): { done: number; flagged: number; total: number; latest: Map<HpProgram, HpResult> } {
  const latest = latestHealthCheckByProgram(results);
  const done = HP_PROGRAMS.filter((program) => latest.has(program)).length;
  const flagged = HP_PROGRAMS.filter((program) => {
    const status = healthCheckStatus(latest.get(program));
    return status === "flagged" || status === "abnormal";
  }).length;
  return { done, flagged, total: HP_PROGRAMS.length, latest };
}

export function healthCheckSummaryLine(results: HpResult[]): string {
  const { done, flagged, total } = summarizeHealthChecks(results);
  return flagged > 0 ? `${done} of ${total} done, ${flagged} flagged` : `${done} of ${total} done`;
}
