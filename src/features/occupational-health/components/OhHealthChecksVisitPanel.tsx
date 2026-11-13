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
  HP_PROGRAMS,
  fetchHpResults,
  type HpProgram,
  type HpResult,
} from "@/features/occupational-health/services/health-programs.service";

export type HealthCheckStatus = "not_done" | "recorded" | "flagged" | "abnormal";

export function healthCheckStatus(result: HpResult | undefined): HealthCheckStatus {
  if (!result) return "not_done";
  if (result.outcome === "restricted" || result.outcome === "unfit") return "abnormal";
  const flags = result.computed?.flags ?? [];
  if (flags.length > 0 || result.referral) return "flagged";
  return "recorded";
}

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

function latestByProgram(results: HpResult[]): Map<HpProgram, HpResult> {
  const map = new Map<HpProgram, HpResult>();
  const sorted = [...results].sort((a, b) => (b.performed_at ?? "").localeCompare(a.performed_at ?? ""));
  for (const row of sorted) {
    if (!map.has(row.program)) map.set(row.program, row);
  }
  return map;
}

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
  return parts.join(" · ") || "—";
}

function unitOf(result: HpResult): string {
  return trendValue(result).unit || "—";
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
      className="rounded px-1.5 py-0.5 text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
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
  const latest = latestByProgram(query.data ?? []);
  const recorded = HP_PROGRAMS.filter((program) => latest.has(program)).length;

  const openManual = (program: HpProgram, existing?: HpResult) => {
    device.dismiss();
    setForm({ program, existing });
  };

  return (
    <div className="space-y-3" data-testid="oh-health-checks-visit-panel">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-brand-navy">Health checks</h2>
          <p className="text-[12px] text-dash-muted">
            {`${recorded} of ${HP_PROGRAMS.length} recorded. Pull from a connected device or enter a result manually.`}
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
          className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-dash-border py-3"
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
        <table className="w-full border-collapse text-left text-[13px] text-brand-navy">
          <thead>
            <tr className="border-b border-dash-border text-[11px] font-medium uppercase tracking-wide text-dash-muted">
              <th className="py-2 pr-3 font-medium">Test</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Result</th>
              <th className="py-2 pr-3 font-medium">Unit</th>
              <th className="py-2 pr-3 font-medium">Interpretation</th>
              <th className="py-2 pr-3 font-medium">Recorded</th>
              <th className="py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {HP_PROGRAMS.map((program) => {
              const result = latest.get(program);
              const status = healthCheckStatus(result);
              return (
                <tr
                  key={program}
                  data-testid={`oh-health-check-row-${program}`}
                  data-status={status}
                  className="border-b border-dash-border/80 align-top"
                >
                  <td className="py-2.5 pr-3 font-medium">{PROGRAM_LABEL[program]}</td>
                  <td className="py-2.5 pr-3">
                    <ImmStatusBadge status={STATUS_TONE[status]} label={STATUS_LABEL[status]} />
                  </td>
                  <td className="py-2.5 pr-3">{result ? headline(result) : "—"}</td>
                  <td className="py-2.5 pr-3 text-dash-muted">{result ? unitOf(result) : "—"}</td>
                  <td className="py-2.5 pr-3 text-[12px] text-dash-muted">{result ? interpretation(result) : "—"}</td>
                  <td className="py-2.5 pr-3 text-[12px] whitespace-nowrap text-dash-muted">
                    {result ? (
                      <>
                        <span>{result.recorded_by_initials || "—"}</span>
                        {result.performed_at ? <span>{` · ${fmtDateTime(result.performed_at)}`}</span> : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
