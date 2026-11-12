"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { TheatreClinicSelect } from "@/features/clinical-theatre/components/TheatreClinicSelect";
import { TheatrePreOpAssessmentPanel } from "@/features/clinical-theatre/components/TheatrePreOpAssessmentPanel";
import { TheatreReadinessBadge } from "@/features/clinical-theatre/components/TheatreReadinessBadge";
import {
  useCreateTheatrePreOpAssessment,
  useTheatrePreOpAssessments,
  useTheatrePreOpQueue,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type { TheatrePreOpQueueRow } from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  formatDateTime,
  waitSummary,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";
import { cn } from "@/lib/utils";

type Selection = { entry?: string; case?: string; name: string };

function rowSelection(row: TheatrePreOpQueueRow): Selection {
  return row.entry_uuid
    ? { entry: row.entry_uuid, name: row.patient.name }
    : { case: row.case?.uuid, name: row.patient.name };
}

/** Pre-op assessment clinic: who needs assessing, required tests and clearance. */
export function TheatrePreOpClinicPage() {
  const searchParams = useSearchParams();
  const initialEntry = searchParams.get("entry");
  const { data: capabilityData } = useMyClinicalCapabilities();
  const capabilities = capabilityData?.capabilities ?? [];
  const canRecord = capabilities.includes("record_theatre_pre_op_clinic");
  const canClear = capabilities.includes("record_theatre_fitness_clearance");
  const [includeReady, setIncludeReady] = useState(false);
  const [clinic, setClinic] = useState("");
  const [selection, setSelection] = useState<Selection | null>(
    initialEntry ? { entry: initialEntry, name: "" } : null,
  );
  const { data: queue = [], isLoading, error } = useTheatrePreOpQueue(includeReady, clinic);

  return (
    <div className="space-y-4 p-4" data-testid="theatre-pre-op-clinic-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Pre-op assessment clinic</h1>
          <p className="text-sm text-muted-foreground">
            Waiting-list patients and upcoming elective cases that are not yet cleared for
            surgery.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <TheatreClinicSelect value={clinic} onChange={setClinic} />
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={includeReady}
              onChange={(event) => setIncludeReady(event.target.checked)}
            />
            Include cleared patients
          </label>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <section className="space-y-2" aria-label="Pre-op queue">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading queue…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{errorMessage(error, "Could not load the queue.")}</p>
          ) : queue.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Everyone on the list is cleared.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="theatre-pre-op-queue">
              {queue.map((row) => {
                const key = row.entry_uuid ?? row.case?.uuid ?? row.patient.uuid;
                const active =
                  (selection?.entry && selection.entry === row.entry_uuid) ||
                  (selection?.case && selection.case === row.case?.uuid);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelection(rowSelection(row))}
                      className={cn(
                        "w-full space-y-1 rounded-md border p-3 text-left hover:bg-muted/40",
                        active ? "border-brand-navy bg-muted/40" : "",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-brand-navy">{row.patient.name}</span>
                        <TheatreReadinessBadge readiness={row.readiness} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.procedures.join(", ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.category ? `${row.category.code} · ` : ""}
                        {row.wait ? waitSummary(row.wait).text : ""}
                        {row.scheduled_start ? ` · theatre ${formatDateTime(row.scheduled_start)}` : ""}
                        {row.kind === "case" ? " · booked case" : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="rounded-md border p-4" aria-label="Assessment">
          {selection ? (
            <SelectedAssessment selection={selection} canRecord={canRecord} canClear={canClear} />
          ) : (
            <p className="text-sm text-muted-foreground">Choose a patient from the queue.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function SelectedAssessment({
  selection,
  canRecord,
  canClear,
}: {
  selection: Selection;
  canRecord: boolean;
  canClear: boolean;
}) {
  const params = selection.entry ? { entry: selection.entry } : { case: selection.case };
  const { data: assessments = [], isLoading, error } = useTheatrePreOpAssessments(params);
  const create = useCreateTheatrePreOpAssessment();
  const latest = assessments[0];

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading assessment…</p>;
  if (error) {
    return <p className="text-sm text-red-600">{errorMessage(error, "Could not load the assessment.")}</p>;
  }
  if (!latest) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          {selection.name ? <span className="font-medium">{selection.name}</span> : "This patient"}{" "}
          has no pre-op assessment yet.
        </p>
        {canRecord ? (
          <Button
            type="button"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                waiting_list_entry: selection.entry ?? null,
                case: selection.case ?? null,
              })
            }
            data-testid="theatre-pre-op-start"
          >
            Start assessment
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            You need the “Run pre-op clinic” capability to start one.
          </p>
        )}
        {create.error ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage(create.error, "Could not start the assessment.")}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-navy">{latest.patient.name}</p>
          <p className="text-xs text-muted-foreground">
            {[latest.patient.identifier, latest.patient.age !== null ? `${latest.patient.age} y` : null, latest.patient.gender, latest.category_code]
              .filter(Boolean)
              .join(" · ")}
            {latest.assessed_by_name ? ` · assessed by ${latest.assessed_by_name}` : ""}
          </p>
        </div>
        {canRecord && (latest.clearance === "unfit" || latest.clearance === "deferred" || (latest.clearance === "fit" && !latest.clearance_valid)) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={create.isPending}
            onClick={() =>
              create.mutate({
                waiting_list_entry: selection.entry ?? null,
                case: selection.case ?? null,
              })
            }
          >
            New assessment
          </Button>
        ) : null}
      </div>
      <TheatrePreOpAssessmentPanel assessment={latest} canRecord={canRecord} canClear={canClear} />
    </div>
  );
}
