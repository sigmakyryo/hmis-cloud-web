"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ListPageDataTableCell,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";
import { sessionFormSteps, type SessionFormStep } from "@/features/occupational-health/lib/oh-session-forms";
import {
  fetchOhCofResponses,
  fetchOhEncounters,
  fetchOhExaminations,
} from "@/features/occupational-health/services/oh.service";
import type { OhExamination, OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";

type OhEmployeeSessionRowsProps = {
  customerUuid: string;
  employeeForms: OhTemplateCapture[];
};

export function OhEmployeeSessionRows({ customerUuid, employeeForms }: OhEmployeeSessionRowsProps) {
  const encounters = useQuery({
    queryKey: ["oh-encounters", "employee-forms", customerUuid],
    queryFn: () => fetchOhEncounters({ pageSize: 100 }),
  });
  const examinations = useQuery({
    queryKey: ["oh-examinations"],
    queryFn: fetchOhExaminations,
  });
  const certificates = useQuery({
    queryKey: ["oh-cof-responses"],
    queryFn: fetchOhCofResponses,
  });
  const [openUuid, setOpenUuid] = useState<string | null>(null);
  const visits = (encounters.data ?? [])
    .filter((visit) => visit.customer_uuid === customerUuid)
    .toSorted((left, right) => sessionDate(right).localeCompare(sessionDate(left)));

  if (encounters.isLoading) {
    return (
      <ListPageDataTableRow>
        <ListPageDataTableCell colSpan={6} className="text-sm text-dash-muted">
          Loading visits…
        </ListPageDataTableCell>
      </ListPageDataTableRow>
    );
  }

  if (encounters.isError) {
    return (
      <ListPageDataTableRow>
        <ListPageDataTableCell colSpan={6} className="text-sm text-red-700">
          Occupational visits could not be loaded.
        </ListPageDataTableCell>
      </ListPageDataTableRow>
    );
  }

  if (visits.length === 0) {
    return (
      <ListPageDataTableRow>
        <ListPageDataTableCell colSpan={6} className="text-sm text-dash-muted">
          No occupational visits yet.
        </ListPageDataTableCell>
      </ListPageDataTableRow>
    );
  }

  return (
    <>
      {visits.map((visit) => {
        const open = openUuid === visit.uuid;
        const steps = sessionFormSteps(visit.visit_type ?? null);
        return (
          <Fragment key={visit.uuid}>
            <ListPageDataTableRow data-testid="oh-employee-session-row">
              <ListPageDataTableCell>
                <p className="font-medium text-brand-navy">{visit.visit_type?.name ?? "Occupational visit"}</p>
                <p className="text-[12px] text-dash-muted">{visit.department_name || visit.location_name || "Visit"}</p>
              </ListPageDataTableCell>
              <ListPageDataTableCell>{formatWhen(sessionDate(visit))}</ListPageDataTableCell>
              <ListPageDataTableCell>{visitStatusLabel(visit.status)}</ListPageDataTableCell>
              <ListPageDataTableCell>{visit.clinician_name || "—"}</ListPageDataTableCell>
              <ListPageDataTableCell>{formatWhen(visit.updated_at)}</ListPageDataTableCell>
              <ListPageDataTableCell className="text-right">
                <button
                  type="button"
                  aria-expanded={open}
                  className="text-[13px] font-medium text-brand-primary"
                  onClick={() => setOpenUuid(open ? null : visit.uuid)}
                >
                  {open ? "Hide forms" : "Show forms"}
                </button>
              </ListPageDataTableCell>
            </ListPageDataTableRow>
            {open ? (
              <ListPageDataTableRow>
                <ListPageDataTableCell colSpan={6}>
                  <ul className="space-y-2 py-1" data-testid="oh-employee-session-forms">
                    {steps.map((step) => {
                      const progress = formProgress(step, visit, examinations.data ?? [], certificates.data ?? [], employeeForms);
                      return (
                        <li key={step.kind === "attached" ? step.uuid : step.kind} className="flex items-baseline justify-between gap-4 text-sm">
                          <span className="text-brand-navy">{step.title}</span>
                          <span className="text-dash-muted">
                            {progress.label}
                            {progress.when === "—" ? "" : ` · ${progress.when}`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </ListPageDataTableCell>
              </ListPageDataTableRow>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

function sessionDate(visit: OhVisitEncounter) {
  return visit.visit_date ?? visit.started_at ?? visit.created_at ?? "";
}

function formatWhen(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function visitStatusLabel(status: string) {
  if (status === "in_progress") return "In progress";
  if (status === "completed") return "Completed";
  if (status === "waiting") return "Waiting";
  return status;
}

function formProgress(
  step: SessionFormStep,
  visit: OhVisitEncounter,
  examinations: OhExamination[],
  certificates: OhTemplateCapture[],
  employeeForms: OhTemplateCapture[],
) {
  if (step.kind === "examination") {
    const exam = examinations.find((row) => row.encounter === visit.id);
    if (!exam) return { label: "Not started", when: "—" };
    if ((exam.row_version ?? 0) > 1) return { label: "Submitted", when: formatWhen(exam.updated_at) };
    return { label: "In progress", when: formatWhen(exam.updated_at) };
  }
  if (step.kind === "certificate") {
    return captureProgress(certificates.find((row) => row.encounter === visit.id));
  }
  if (step.kind === "employee") {
    return captureProgress(employeeForms.find((row) => row.encounter === visit.id));
  }
  return { label: "Included", when: "—" };
}

function captureProgress(row: OhTemplateCapture | undefined) {
  if (!row) return { label: "Not started", when: "—" };
  const when = formatWhen(row.submitted_at ?? row.updated_at ?? "");
  if (row.status === "uploaded") return { label: "Uploaded", when };
  if (row.status === "submitted" || (row.row_version ?? 0) > 1) return { label: "Submitted", when };
  if (row.status === "in_progress") return { label: "In progress", when };
  return { label: "Not started", when: "—" };
}
