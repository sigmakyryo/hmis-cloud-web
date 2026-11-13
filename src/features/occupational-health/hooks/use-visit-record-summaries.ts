"use client";

import { useQuery } from "@tanstack/react-query";

import { OVERALL_LABEL, label } from "@/app/(app)/fitness/_components/shared/fit-format";
import { summarizeHealthChecks } from "@/features/occupational-health/lib/health-check-status";
import type { OhClinicalModuleId } from "@/features/occupational-health/lib/oh-visit-workspace";
import { fetchDaVisitPanel } from "@/features/occupational-health/services/drug-alcohol.service";
import { fetchFitWorker } from "@/features/occupational-health/services/fitness.service";
import { fetchHpResults } from "@/features/occupational-health/services/health-programs.service";
import { fetchOhImmPatient } from "@/features/occupational-health/services/immunisation.service";
import { fetchIodCases } from "@/features/occupational-health/services/oh.service";

export type VisitRecordBadgeTone = "muted" | "ok" | "attention" | "needed";

export type VisitRecordBadge = {
  label: string;
  tone: VisitRecordBadgeTone;
};

type Options = {
  customerUuid?: string | null;
  encounterUuid?: string | null;
  encounterId?: number | null;
  needsEmployment?: boolean;
  episodeCount?: number;
};

/** Status and count badges for the visit Records rail, using the same queries as the panels. */
export function useVisitRecordSummaries({
  customerUuid,
  encounterUuid,
  encounterId,
  needsEmployment = false,
  episodeCount = 0,
}: Options): Record<OhClinicalModuleId, VisitRecordBadge | null> {
  const ready = Boolean(customerUuid && encounterUuid);
  const customer = customerUuid ?? "";
  const encounter = encounterUuid ?? "";

  const immunizations = useQuery({
    queryKey: ["oh-imm-patient", customer],
    queryFn: () => fetchOhImmPatient(customer),
    enabled: ready,
    retry: false,
  });
  const drugAlcohol = useQuery({
    queryKey: ["oh-da", "visit-panel", encounter, customer],
    queryFn: () => fetchDaVisitPanel(encounter, customer),
    enabled: ready,
    retry: false,
  });
  const healthChecks = useQuery({
    queryKey: ["oh-hp", "results", "visit", encounter],
    queryFn: () => fetchHpResults({ visit_uuid: encounter }),
    enabled: ready,
    retry: false,
  });
  const fitness = useQuery({
    queryKey: ["oh-fit", "worker", customer],
    queryFn: () => fetchFitWorker(customer),
    enabled: ready,
    retry: false,
  });
  const injuries = useQuery({
    queryKey: ["oh-iod-cases"],
    queryFn: fetchIodCases,
    enabled: ready,
    retry: false,
  });

  const immBadge = ((): VisitRecordBadge | null => {
    if (!immunizations.data) return null;
    const statuses = immunizations.data.statuses ?? [];
    const open = statuses.filter((row) => row.status === "due" || row.status === "overdue");
    if (open.length > 0) {
      const overdue = open.filter((row) => row.status === "overdue").length;
      return {
        label: overdue > 0 ? `${overdue} overdue` : `${open.length} due`,
        tone: "attention",
      };
    }
    if (statuses.length === 0 && (immunizations.data.doses ?? []).length === 0) {
      return { label: "None", tone: "muted" };
    }
    return { label: "Up to date", tone: "ok" };
  })();

  const daBadge = ((): VisitRecordBadge | null => {
    if (!drugAlcohol.data) return null;
    if (!drugAlcohol.data.policy) return { label: "No policy", tone: "needed" };
    const tests = drugAlcohol.data.tests ?? [];
    if (tests.length > 0) return { label: `${tests.length}`, tone: "ok" };
    return { label: "Ready", tone: "muted" };
  })();

  const hcBadge = ((): VisitRecordBadge | null => {
    if (!healthChecks.data) return null;
    const summary = summarizeHealthChecks(healthChecks.data);
    if (summary.flagged > 0) return { label: `${summary.flagged} flagged`, tone: "attention" };
    if (summary.done === 0) return { label: "0 of 5", tone: "muted" };
    return { label: `${summary.done} of ${summary.total}`, tone: summary.done === summary.total ? "ok" : "muted" };
  })();

  const fitnessBadge = ((): VisitRecordBadge | null => {
    if (!fitness.data) return null;
    const overall = fitness.data.overall;
    const text =
      overall === "fit_with_restrictions"
        ? "Restricted"
        : overall === "not_fit"
          ? "Not fit"
          : overall === "unknown"
            ? "Unknown"
            : label(OVERALL_LABEL, overall);
    const tone: VisitRecordBadgeTone =
      overall === "fit" ? "ok" : overall === "unknown" ? "muted" : "attention";
    return { label: text, tone };
  })();

  const employmentBadge: VisitRecordBadge | null = needsEmployment
    ? { label: "Needed", tone: "needed" }
    : episodeCount > 0
      ? { label: `${episodeCount}`, tone: "ok" }
      : null;

  const injuriesBadge = ((): VisitRecordBadge | null => {
    if (!injuries.data) return null;
    const visitCases =
      encounterId != null
        ? injuries.data.filter((row) => row.encounter === encounterId)
        : injuries.data;
    if (visitCases.length === 0) return { label: "None", tone: "muted" };
    const open = visitCases.filter((row) => row.status !== "closed");
    if (open.length > 0) return { label: `${open.length} open`, tone: "attention" };
    return { label: `${visitCases.length}`, tone: "ok" };
  })();

  return {
    immunizations: immBadge,
    "drug-alcohol": daBadge,
    "health-checks": hcBadge,
    injuries: injuriesBadge,
    fitness: fitnessBadge,
    employment: employmentBadge,
  };
}
