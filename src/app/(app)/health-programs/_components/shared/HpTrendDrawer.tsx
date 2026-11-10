"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { DaFact, DaSection } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { errorText, fmtDate } from "@/app/(app)/fitness/_components/shared/fit-format";
import { fetchHpTrend, voidHpResult, type HpProgram } from "@/features/occupational-health/services/health-programs.service";
import { useToast } from "@/providers/toast-provider";
import { HpResultForm } from "./HpResultForm";
import { HpTrendChart } from "./HpTrendChart";
import { OUTCOME_LABEL, OUTCOME_TONE, PROGRAM_LABEL, flagText, headline } from "./hp-format";

export function HpTrendDrawer({ customerUuid, program, onClose }: { customerUuid: string; program: HpProgram; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [recording, setRecording] = useState(false);
  const query = useQuery({ queryKey: ["oh-hp", "trend", customerUuid, program], queryFn: () => fetchHpTrend(customerUuid, program) });
  const voidIt = useMutation({
    mutationFn: (uuid: string) => {
      const reason = window.prompt("Why remove this result? (for example: wrong worker)") ?? "";
      if (!reason.trim()) throw new Error("No reason given, nothing changed.");
      return voidHpResult(uuid, reason.trim());
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Result removed" });
      void client.invalidateQueries({ queryKey: ["oh-hp"] });
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not removed", description: errorText(error) }),
  });
  const results = query.data?.results ?? [];

  if (recording) {
    return <HpResultForm program={program} customerUuid={customerUuid} workerLabel={query.data?.worker_label} onClose={() => setRecording(false)} />;
  }
  return (
    <Drawer title={`${PROGRAM_LABEL[program]} — ${query.data?.worker_label || "worker"}`} onClose={onClose} wide>
      <div className="flex justify-end">
        <ImmEmployeeLink uuid={customerUuid} />
      </div>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load results.")}</LoadError> : null}
      {query.isSuccess ? <HpTrendChart results={results} /> : null}
      {results.length > 0 ? (
        <DaSection title="Results">
          {[...results].reverse().map((r) => (
            <DaFact key={r.uuid} label={`${fmtDate(r.performed_at)}${r.is_baseline ? " · baseline" : ""}`}>
              <span className="flex flex-col items-end gap-1">
                <span>{headline(r)}</span>
                {r.computed?.flags?.length ? <span className="text-[12px] text-amber-700">{flagText(r.computed.flags)}</span> : null}
                <span className="inline-flex items-center gap-2">
                  <ImmStatusBadge status={OUTCOME_TONE[r.outcome]} label={OUTCOME_LABEL[r.outcome]} />
                  {r.referral ? <ImmStatusBadge status="pending" label="Referral" /> : null}
                  <button type="button" className="text-[12px] text-brand-primary hover:underline" onClick={() => voidIt.mutate(r.uuid)}>
                    Remove
                  </button>
                </span>
              </span>
            </DaFact>
          ))}
        </DaSection>
      ) : null}
      <DrawerActions>
        <SecondaryButton size="sm" onClick={() => setRecording(true)}>
          Record result
        </SecondaryButton>
      </DrawerActions>
    </Drawer>
  );
}
