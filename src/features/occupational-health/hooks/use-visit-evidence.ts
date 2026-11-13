"use client";

import { useQuery } from "@tanstack/react-query";

import {
  buildVisitEvidence,
  medicalExamEvidenceLine,
  type VisitEvidenceLine,
} from "@/features/occupational-health/lib/visit-evidence";
import { fetchDaVisitPanel } from "@/features/occupational-health/services/drug-alcohol.service";
import { fetchHpResults } from "@/features/occupational-health/services/health-programs.service";
import { fetchOhImmPatient } from "@/features/occupational-health/services/immunisation.service";
import type { OhExamination } from "@/features/occupational-health/types";

type Options = {
  customerUuid?: string | null;
  encounterUuid?: string | null;
  examinations?: OhExamination[] | null;
  includeExam?: boolean;
};

/** Per-programme evidence lines, sharing the Records-rail query keys. */
export function useVisitEvidence({
  customerUuid,
  encounterUuid,
  examinations = null,
  includeExam = false,
}: Options): { lines: VisitEvidenceLine[]; loading: boolean } {
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

  return {
    lines: buildVisitEvidence({
      healthChecks: healthChecks.data,
      healthReady: healthChecks.isSuccess,
      drugAlcohol: drugAlcohol.data,
      drugAlcoholReady: drugAlcohol.isSuccess,
      immunizations: immunizations.data,
      immunizationsReady: immunizations.isSuccess,
      examLine: includeExam ? medicalExamEvidenceLine(examinations) : null,
    }),
    loading: ready && (healthChecks.isPending || drugAlcohol.isPending || immunizations.isPending),
  };
}
