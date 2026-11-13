"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDateTime } from "@/app/(app)/fitness/_components/shared/fit-format";
import { HpResultForm } from "@/app/(app)/health-programs/_components/shared/HpResultForm";
import { OUTCOME_LABEL, PROGRAM_LABEL, flagText, headline, trendValue } from "@/app/(app)/health-programs/_components/shared/hp-format";
import { useHealthCheckDevice } from "@/features/occupational-health/lib/health-check-device";
import {
  healthCheckStatus,
  healthCheckSummaryLine,
  summarizeHealthChecks,
  type HealthCheckStatus,
} from "@/features/occupational-health/lib/health-check-status";
import {
  HP_PROGRAMS,
  fetchHpResults,
  type HpProgram,
  type HpResult,
} from "@/features/occupational-health/services/health-programs.service";

export type { HealthCheckStatus };
export { healthCheckStatus };

const STATUS_LABEL: Record<HealthCheckStatus, string> = {
  not_done: "Not done",
  recorded: "Recorded",
  flagged: "Flagged",
  abnormal: "Abnormal",
};

/** ImmStatusBadge tones: muted for not done, green recorded, amber flagged, red abnormal. */
const STATUS_TONE: Record<HealthCheckStatus, string> = {
  not_done: "not_done",
  recorded: "cleared",
  flagged: "expiring",
  abnormal: "not_cleared",
};

function interpretation(result: HpResult): string {
  const parts: string[] = [];
  if (result.outcome !== "fit") {
    const outcome = OUTCOME_LABEL[result.outcome];
    if (outcome) parts.push(outcome);
  }
  const flags = flagText(result.computed?.flags);
  if (flags) parts.push(flags);
  if (result.restrictions.length) parts.push(result.restrictions.join("; "));
  if (result.referral) parts.push("Referral");
  if (result.is_baseline) parts.push("Baseline");
  return parts.join(" · ");
}

function unitOf(result: HpResult): string {
  return trendValue(result).unit;
}

function RowAction({
  children,
  onClick,
  testId,
}: {
  children: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="rounded px-1 py-0.5 text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
    >
      {children}
    </button>
  );
}

type FormState = { program: HpProgram; existing?: HpResult };

/** Visit step: all five health checks, with manual entry, edit, and a UI-only device pull. */
export function OhHealthChecksVisitPanel({ customerUuid, encounterUuid }: { customerUuid: string; encounterUuid: string }) {
  const [form, setForm] = useState<FormState | null>(null);
  const device = useHealthCheckDevice();
  const query = useQuery({
    queryKey: ["oh-hp", "results", "visit", encounterUuid],
    queryFn: () => fetchHpResults({ visit_uuid: encounterUuid }),
  });
  const summary = summarizeHealthChecks(query.data ?? []);
  const latest = summary.latest;

  const openManual = (program: HpProgram, existing?: HpResult) => {
    device.dismiss();
    setForm({ program, existing });
  };

  return (
    <div className="space-y-1" data-testid="oh-health-checks-visit-panel">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-dash-border pb-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-brand-navy">Health checks</h2>
          <p className="text-[12px] text-dash-muted" data-testid="oh-health-check-summary">
            {healthCheckSummaryLine(query.data ?? [])}
          </p>
        </div>
        <SecondaryButton
          size="sm"
          data-testid="oh-health-check-pull-devices"
          onClick={() => {
            void device.pullFromDevice("panel");
          }}
        >
          Pull from devices
        </SecondaryButton>
      </div>

      {device.prompt ? (
        <div
          role="status"
          data-testid="oh-health-check-no-device"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-dash-border py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-brand-navy">No device connected yet</p>
            <p className="text-[12px] text-dash-muted">
              {device.prompt.program
                ? `Connect a ${PROGRAM_LABEL[device.prompt.program].toLowerCase()} device to pull results, or enter them manually.`
                : "Connect a testing device to pull results automatically, or enter a test manually from the list."}
            </p>
          </div>
          {device.prompt.program ? (
            <RowAction
              testId="oh-health-check-device-enter-manual"
              onClick={() => {
                const program = device.prompt?.program;
                if (program) openManual(program, latest.get(program));
              }}
            >
              Enter manually
            </RowAction>
          ) : null}
          <RowAction testId="oh-health-check-device-dismiss" onClick={device.dismiss}>
            Close
          </RowAction>
        </div>
      ) : null}

      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load this visit's checks.")}</LoadError> : null}

      {!query.isLoading && !query.isError ? (
        <ul className="divide-y divide-dash-border">
          {HP_PROGRAMS.map((program) => {
            const result = latest.get(program);
            const status = healthCheckStatus(result);
            const unit = result ? unitOf(result) : "";
            const note = result ? interpretation(result) : "";
            const recorded = result
              ? [result.recorded_by_initials || null, result.performed_at ? fmtDateTime(result.performed_at) : null]
                  .filter(Boolean)
                  .join(" · ")
              : "";
            return (
              <li
                key={program}
                data-testid={`oh-health-check-row-${program}`}
                data-status={status}
                className="flex items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-brand-navy">{PROGRAM_LABEL[program]}</h3>
                    <ImmStatusBadge status={STATUS_TONE[status]} label={STATUS_LABEL[status]} />
                  </div>
                  {result ? (
                    <>
                      <p className="mt-1 text-[13px] leading-snug text-brand-navy">
                        {headline(result)}
                        {unit ? <span className="ml-1.5 text-dash-muted">{unit}</span> : null}
                      </p>
                      {note || recorded ? (
                        <p className="mt-0.5 text-[12px] leading-snug text-dash-muted">
                          {[note, recorded].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 text-[12px] text-dash-muted">Not recorded on this visit.</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                  {result ? (
                    <RowAction testId={`oh-health-check-edit-${program}`} onClick={() => openManual(program, result)}>
                      Edit
                    </RowAction>
                  ) : (
                    <RowAction testId={`oh-health-check-manual-${program}`} onClick={() => openManual(program)}>
                      Enter manually
                    </RowAction>
                  )}
                  <RowAction
                    testId={`oh-health-check-device-${program}`}
                    onClick={() => {
                      void device.pullFromDevice("test", program);
                    }}
                  >
                    Pull from device
                  </RowAction>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {form ? (
        <HpResultForm
          key={form.existing?.uuid ?? `new-${form.program}`}
          program={form.program}
          customerUuid={customerUuid}
          visitUuid={encounterUuid}
          existing={form.existing}
          onClose={() => setForm(null)}
        />
      ) : null}
    </div>
  );
}
