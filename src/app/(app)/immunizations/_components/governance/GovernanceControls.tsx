"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import {
  createOhImmAccessClient,
  createOhImmBoardMember,
  createOhImmFitTest,
  decideOhImmAccommodation,
  fetchOhImmAccessClients,
  fetchOhImmAccommodations,
  fetchOhImmBoardMembers,
  fetchOhImmControls,
  fetchOhImmFitTestsDue,
  fetchOhImmTaskHierarchy,
  fetchOhImmTasks,
  fetchOhImmZoneClearance,
  fetchOhImmZones,
  fileOhImmDeclination,
  seedOhImmControls,
  seedOhImmZones,
} from "@/features/occupational-health/services/immunisation.service";

export function GovernanceControls() {
  const qc = useQueryClient();
  const zonesQ = useQuery({ queryKey: ["oh-imm-zones"], queryFn: fetchOhImmZones });
  const clientsQ = useQuery({ queryKey: ["oh-imm-access-clients"], queryFn: fetchOhImmAccessClients });
  const controlsQ = useQuery({ queryKey: ["oh-imm-controls"], queryFn: fetchOhImmControls });
  const tasksQ = useQuery({ queryKey: ["oh-imm-tasks"], queryFn: fetchOhImmTasks });
  const boardQ = useQuery({ queryKey: ["oh-imm-board"], queryFn: fetchOhImmBoardMembers });
  const accQ = useQuery({ queryKey: ["oh-imm-accommodations"], queryFn: () => fetchOhImmAccommodations() });
  const fitDueQ = useQuery({ queryKey: ["oh-imm-fit-due"], queryFn: () => fetchOhImmFitTestsDue(45) });
  const [msg, setMsg] = useState("");
  const [secretOnce, setSecretOnce] = useState("");
  const [zoneSel, setZoneSel] = useState("");
  const [clearance, setClearance] = useState<Array<Record<string, unknown>>>([]);
  const [hier, setHier] = useState<Record<string, unknown> | null>(null);
  const [decl, setDecl] = useState({ customer_uuid: "", vaccine_code: "HEPB", signed_by: "Employee" });

  const loading = zonesQ.isLoading || clientsQ.isLoading || controlsQ.isLoading || boardQ.isLoading || accQ.isLoading || fitDueQ.isLoading;
  const errored = zonesQ.isError || clientsQ.isError || controlsQ.isError || boardQ.isError || accQ.isError || fitDueQ.isError;

  if (loading) return <QuietLoading />;
  if (errored) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load governance data. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="oh-imm-governance-panel">
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      {secretOnce ? (
        <p className="text-sm text-amber-800">
          Client secret (shown once): <span className="font-mono">{secretOnce}</span>
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Zone clearance</h3>
        <p className="text-sm text-muted-foreground">
          Privacy-shielded feed: cleared / not_cleared / expiring + valid_until only — no clinical detail.
        </p>
        <div className="flex flex-wrap gap-2">
          {(zonesQ.data ?? []).length === 0 ? (
            <EmptyAction title="No zones yet" description="Add labs, clean rooms, or wards with required vaccines and risk controls." />
          ) : null}
          <SecondaryButton type="button" className="h-8" onClick={() => void seedOhImmZones().then((r) => { setMsg(`Zones seeded (${r.seeded})`); void qc.invalidateQueries({ queryKey: ["oh-imm-zones"] }); }).catch((e: Error) => setMsg(e.message))}>
            Seed example zones
          </SecondaryButton>
          <select className="h-8 rounded border px-2 text-sm" value={zoneSel} onChange={(e) => setZoneSel(e.target.value)}>
            <option value="">Zone…</option>
            {(zonesQ.data ?? []).map((z) => (
              <option key={String(z.uuid)} value={String(z.uuid)}>{String(z.code)} — {String(z.name)}</option>
            ))}
          </select>
          <PrimaryButton type="button" className="h-8" disabled={!zoneSel} onClick={() => void fetchOhImmZoneClearance(zoneSel).then((rows) => setClearance(rows))}>
            View clearance
          </PrimaryButton>
        </div>
        {clearance.length > 0 ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">Employee</th><th>Status</th><th>Valid until</th></tr></thead>
            <tbody>
              {clearance.map((r) => (
                <tr key={String(r.customer_uuid)} className="border-b border-border/60">
                  <td className="py-1 font-mono text-xs">{String(r.customer_uuid).slice(0, 8)}</td>
                  <td>{String(r.status)}</td>
                  <td>{String(r.valid_until ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Access clients (HMAC)</h3>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="button" className="h-8" onClick={() => void createOhImmAccessClient({ name: `HR card ${Date.now()}` }).then((r) => { setSecretOnce(r.secret); setMsg(`Client ${r.client.client_key}`); void qc.invalidateQueries({ queryKey: ["oh-imm-access-clients"] }); })}>
            Create client
          </PrimaryButton>
        </div>
        {(clientsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No HMAC clients yet. Create one for HR or access-card systems (secret shown once).</p>
        ) : null}
        <ul className="text-sm">
          {(clientsQ.data ?? []).map((c) => (
            <li key={String(c.uuid)} className="border-b border-border/60 py-1 font-mono text-xs">
              {String(c.client_key)} · {String(c.name)} · webhook {c.has_webhook ? "yes" : "skipped_unconfigured"}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Hierarchy of controls</h3>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" className="h-8" onClick={() => void seedOhImmControls().then((r) => { setMsg(`Controls seeded (${r.seeded})`); void qc.invalidateQueries({ queryKey: ["oh-imm-controls"] }); })}>
            Seed controls
          </SecondaryButton>
          <select className="h-8 rounded border px-2 text-sm" onChange={(e) => { const v = e.target.value; if (v) void fetchOhImmTaskHierarchy(v).then(setHier); }}>
            <option value="">Task hierarchy…</option>
            {(tasksQ.data ?? []).map((task) => (
              <option key={task.uuid} value={task.uuid}>{task.code}</option>
            ))}
          </select>
        </div>
        {hier ? (
          <div className="space-y-1 text-sm">
            <p>Inherent {String(hier.inherent_score)} → residual {String(hier.residual_score)} ({String(hier.band)})</p>
            {Object.entries((hier.levels as Record<string, Array<Record<string, unknown>>>) ?? {}).map(([lvl, items]) => (
              <div key={lvl} className="border-l-2 border-primary/40 pl-2">
                <div className="font-medium capitalize">{lvl}</div>
                {items.length === 0 ? <div className="text-muted-foreground">—</div> : items.map((c) => <div key={String(c.uuid)}>{String(c.name)} (−{String(c.residual_risk_delta)})</div>)}
              </div>
            ))}
          </div>
        ) : (
          <ul className="text-sm text-muted-foreground">
            {(controlsQ.data ?? []).slice(0, 8).map((c) => (
              <li key={String(c.uuid)}>{String(c.level)} · {String(c.code)} · {String(c.name)}</li>
            ))}
          </ul>
        )}
        <div className="pt-2">
          <p className="text-sm font-medium">Fit-tests due</p>
          {(fitDueQ.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">None due.</p> : (
            <ul className="text-sm">{(fitDueQ.data ?? []).map((f) => <li key={String(f.uuid)}>{String(f.customer_uuid).slice(0, 8)} · expires {String(f.expires_on)} · {String(f.status)}</li>)}</ul>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <PrimaryButton type="button" className="h-8" onClick={() => {
              const customer = prompt("Employee UUID for fit-test");
              if (!customer) return;
              void createOhImmFitTest({ customer_uuid: customer, respirator_model: "N95", result: "pass", tested_by: "OH" }).then(() => { setMsg("Fit-test saved"); void qc.invalidateQueries({ queryKey: ["oh-imm-fit-due"] }); });
            }}>Record fit-test</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Declinations & medical board</h3>
        <p className="text-sm text-muted-foreground">Non-punitive informed declination → board decision → compliance / zone clearance.</p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" className="h-8" onClick={() => void createOhImmBoardMember({ name: "OH Physician", role: "chair" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-board"] }))}>Add board chair</SecondaryButton>
          <input className="h-8 w-48 rounded border px-2 text-sm" placeholder="Employee UUID" value={decl.customer_uuid} onChange={(e) => setDecl((d) => ({ ...d, customer_uuid: e.target.value }))} />
          <PrimaryButton type="button" className="h-8" onClick={() => void fileOhImmDeclination({ ...decl, informed_signed: true }).then(() => { setMsg("Declination filed"); void qc.invalidateQueries({ queryKey: ["oh-imm-accommodations"] }); })}>File declination</PrimaryButton>
        </div>
        <ul className="text-sm">
          {(boardQ.data ?? []).map((m) => <li key={String(m.uuid)}>{String(m.role)} · {String(m.name)}</li>)}
        </ul>
        {(accQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No declinations or accommodations on file.</p>
        ) : null}
        <ul className="text-sm">
          {(accQ.data ?? []).map((a) => (
            <li key={String(a.uuid)} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-1">
              <span className="font-mono text-xs">{String(a.vaccine_code)}</span>
              <span>{String(a.board_status)} {String(a.decision || "")}</span>
              {a.board_status === "pending" ? (
                <SecondaryButton type="button" className="h-7 px-2 text-xs" onClick={() => void decideOhImmAccommodation(String(a.uuid), { decision: "specialized_ppe", decided_by: "board", conditions: "PPE plan" }).then(() => void qc.invalidateQueries({ queryKey: ["oh-imm-accommodations"] }))}>Approve PPE</SecondaryButton>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

