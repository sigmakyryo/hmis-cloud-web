"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { DaFact, DaSection } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { errorText } from "@/app/(app)/fitness/_components/shared/fit-format";
import { HpResultForm } from "@/app/(app)/health-programs/_components/shared/HpResultForm";
import { OUTCOME_LABEL, OUTCOME_TONE, PROGRAM_LABEL, flagText, headline } from "@/app/(app)/health-programs/_components/shared/hp-format";
import { HP_PROGRAMS, fetchHpResults, type HpProgram } from "@/features/occupational-health/services/health-programs.service";

/** Visit step: record hearing, lung, vision, ergonomics and fatigue checks; billed through the visit. */
export function OhHealthChecksVisitPanel({ customerUuid, encounterUuid }: { customerUuid: string; encounterUuid: string }) {
  const [program, setProgram] = useState<HpProgram | null>(null);
  const query = useQuery({
    queryKey: ["oh-hp", "results", "visit", encounterUuid],
    queryFn: () => fetchHpResults({ visit_uuid: encounterUuid }),
  });
  return (
    <div className="space-y-4" data-testid="oh-health-checks-visit-panel">
      <div className="flex flex-wrap gap-2">
        {HP_PROGRAMS.map((p) => (
          <SecondaryButton key={p} size="sm" onClick={() => setProgram(p)}>
            {PROGRAM_LABEL[p]}
          </SecondaryButton>
        ))}
      </div>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load this visit's checks.")}</LoadError> : null}
      <DaSection title="Recorded in this visit">
        {(query.data ?? []).length === 0 ? (
          <p className="text-[13px] text-dash-muted">No health checks recorded yet.</p>
        ) : (
          (query.data ?? []).map((r) => (
            <DaFact key={r.uuid} label={PROGRAM_LABEL[r.program]}>
              <span className="flex flex-col items-end gap-1">
                <span>{headline(r)}</span>
                {r.computed?.flags?.length ? <span className="text-[12px] text-amber-700">{flagText(r.computed.flags)}</span> : null}
                <ImmStatusBadge status={OUTCOME_TONE[r.outcome]} label={OUTCOME_LABEL[r.outcome]} />
              </span>
            </DaFact>
          ))
        )}
      </DaSection>
      {program ? <HpResultForm program={program} customerUuid={customerUuid} visitUuid={encounterUuid} onClose={() => setProgram(null)} /> : null}
    </div>
  );
}
