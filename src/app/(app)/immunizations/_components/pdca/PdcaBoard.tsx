"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import {
  addOhImmRcaAction,
  createOhImmSeroAudit,
  createOhImmVendor,
  fetchOhImmPdca,
  fetchOhImmSeroAudits,
  fetchOhImmVendors,
  recordOhImmColdChain,
  recordOhImmSeroAggregates,
  updateOhImmRca,
} from "@/features/occupational-health/services/immunisation.service";

export function PdcaBoard() {
  const qc = useQueryClient();
  const boardQ = useQuery({ queryKey: ["oh-imm-pdca"], queryFn: fetchOhImmPdca });
  const seroQ = useQuery({ queryKey: ["oh-imm-sero"], queryFn: fetchOhImmSeroAudits });
  const vendorsQ = useQuery({ queryKey: ["oh-imm-vendors"], queryFn: fetchOhImmVendors });
  const [msg, setMsg] = useState("");
  const stages = ["plan", "do", "check", "act"] as const;

  const loading = boardQ.isLoading || seroQ.isLoading || vendorsQ.isLoading;
  const errored = boardQ.isError || seroQ.isError || vendorsQ.isError;
  if (loading) return <QuietLoading />;
  if (errored) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load PDCA board. Check your connection and try again.
      </p>
    );
  }

  const totalRca = stages.reduce((n, s) => n + (((boardQ.data?.[s] as Array<Record<string, unknown>>) ?? []).length), 0);

  return (
    <div className="space-y-6" data-testid="oh-imm-pdca-panel">
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">PDCA board</h3>
        <p className="text-sm text-muted-foreground">Complete RCA stubs from exposures — team, 5-whys, fishbone, actions, effectiveness.</p>
        {totalRca === 0 ? (
          <EmptyAction title="No RCA items yet" description="Complete exposure RCAs from Exposures — stubs appear here under Plan." />
        ) : null}
        <div className="grid gap-3 md:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage} className="min-h-[8rem] border-t-2 border-primary/50 pt-2">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{stage}</div>
              {((boardQ.data?.[stage] as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Empty</p>
              ) : null}
              {((boardQ.data?.[stage] as Array<Record<string, unknown>>) ?? []).map((rca) => (
                <div key={String(rca.uuid)} className="mb-2 border-b border-border/60 pb-2 text-sm">
                  <div className="font-medium">{String(rca.status)}</div>
                  <div className="text-xs text-muted-foreground">{String(rca.summary || rca.uuid).slice(0, 80)}</div>
                  {stage === "plan" && rca.status === "stub" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void updateOhImmRca(String(rca.uuid), {
                      team: { oh_physician: "OH MD", biosafety_officer: "BSO", line_manager: "LM" },
                      five_whys: ["Unsafe disposal", "No sharps near point of use", "Stockout", "Ordering lag", "No buffer stock"],
                      fishbone: { people: ["fatigue"], process: ["SOP gap"], equipment: ["no safety needle"] },
                      pdca_stage: "do",
                      summary: "RCA in progress",
                    }).then(() => { setMsg("RCA opened"); void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }); })}>
                      Open RCA
                    </SecondaryButton>
                  ) : null}
                  {stage === "do" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void addOhImmRcaAction(String(rca.uuid), { title: "Restock safety sharps", owner: "Ward lead", due_date: new Date(Date.now()+7*864e5).toISOString().slice(0,10), pdca_stage: "do" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }))}>
                      Add action
                    </SecondaryButton>
                  ) : null}
                  {stage === "do" || stage === "check" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void updateOhImmRca(String(rca.uuid), { effectiveness_notes: "No repeat incidents in 30d", pdca_stage: "check" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }))}>
                      Effectiveness
                    </SecondaryButton>
                  ) : null}
                  {stage === "check" ? (
                    <SecondaryButton type="button" className="mt-1 h-7 px-2 text-xs" onClick={() => void updateOhImmRca(String(rca.uuid), { pdca_stage: "act", status: "complete" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-pdca"] }))}>
                      Close Act
                    </SecondaryButton>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Seroprevalence audits</h3>
        <p className="text-sm text-muted-foreground">Aggregate results only; cells below k-anonymity threshold are hidden.</p>
        <PrimaryButton type="button" className="h-8" onClick={() => void createOhImmSeroAudit({ title: `Audit ${new Date().toISOString().slice(0,10)}`, cohort_type: "risk_band", cohort_value: "high", k_anonymity: 5 }).then((a) => {
          void recordOhImmSeroAggregates(String(a.uuid), [
            { cell: "high", n: 12, positive: 3 },
            { cell: "low", n: 3, positive: 1 },
          ]).then(() => { setMsg("Sero audit recorded (small cell hidden)"); void qc.invalidateQueries({ queryKey: ["oh-imm-sero"] }); });
        })}>Run sample audit</PrimaryButton>
        {(seroQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No seroprevalence audits yet. Results stay aggregate-only (k-anonymity).</p>
        ) : null}
        <ul className="text-sm">
          {(seroQ.data ?? []).map((s) => (
            <li key={String(s.uuid)}>{String(s.title)} · k={String(s.k_anonymity)} · {String(s.status)} · cells {Array.isArray((s.aggregate as { cells?: unknown[] } | null)?.cells) ? (s.aggregate as { cells: unknown[] }).cells.length : 0} · hidden {(s.aggregate as { hidden_cells?: number } | null)?.hidden_cells ?? "—"}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Cold-chain / vendors</h3>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" className="h-8" onClick={() => void createOhImmVendor({ code: "VACCO", name: "VacCo Supplies", audit_result: "pass", last_audit_on: new Date().toISOString().slice(0,10) }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-vendors"] }))}>Add vendor</SecondaryButton>
          <PrimaryButton type="button" className="h-8" onClick={() => {
            const lot = prompt("Lot UUID to log (optional)");
            void recordOhImmColdChain({ storage_unit: "Fridge-1", temperature_c: 12, lot_uuid: lot || undefined, lot_number: "demo", recorded_by: "OH" }).then((r) => setMsg(r.excursion ? "Excursion — lot quarantined if provided" : "Temp OK"));
          }}>Log temp (excursion demo 12°C)</PrimaryButton>
        </div>
        <ul className="text-sm">{(vendorsQ.data ?? []).map((v) => <li key={String(v.uuid)}>{String(v.code)} · {String(v.name)} · {String(v.audit_result || "—")}</li>)}</ul>
      </section>
    </div>
  );
}
