"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { QuietLoading } from "../shared/QuietLoading";
import { formatClock } from "../shared/format-clock";
import {
  type OhImmExposure,
  completeOhImmExposureFollowup,
  createOhImmExposure,
  createOhImmExposureOncall,
  fetchOhImmExposureDueFollowups,
  fetchOhImmExposureOncall,
  fetchOhImmExposures,
  recordOhImmExposureAction,
  seedOhImmExposureTypes,
  updateOhImmExposureSource,
} from "@/features/occupational-health/services/immunisation.service";

export function ExposuresWorkbench() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["oh-imm-exposures"], queryFn: () => fetchOhImmExposures({ status: "open" }) });
  const followQ = useQuery({ queryKey: ["oh-imm-exp-followups"], queryFn: () => fetchOhImmExposureDueFollowups(30) });
  const oncallQ = useQuery({ queryKey: ["oh-imm-exp-oncall"], queryFn: () => fetchOhImmExposureOncall() });
  const [form, setForm] = useState({
    customer_uuid: "",
    exposed_at: new Date().toISOString().slice(0, 16),
    exposure_type: "needlestick",
    body_site: "",
    device: "",
    source_known: "unknown",
    first_aid_done: false,
    site: "",
    pathway_code: "",
  });
  const [oncall, setOncall] = useState({ name: "", phone: "", email: "", site: "", shift: "any" });
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createOhImmExposure({
        ...form,
        exposed_at: new Date(form.exposed_at).toISOString(),
        first_aid_done: form.first_aid_done,
      }),
    onSuccess: (row) => {
      setMsg(`Logged ${row.exposure_type} · triage ${row.triage_band}`);
      setSelected(row.uuid);
      void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-exp-followups"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const seed = useMutation({
    mutationFn: seedOhImmExposureTypes,
    onSuccess: (r) => setMsg(`Type defaults ready (${r.seeded} new).`),
  });
  const addOncall = useMutation({
    mutationFn: () => createOhImmExposureOncall(oncall),
    onSuccess: () => {
      setOncall({ name: "", phone: "", email: "", site: "", shift: "any" });
      void qc.invalidateQueries({ queryKey: ["oh-imm-exp-oncall"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const rows = listQ.data ?? [];
  const active = rows.find((r) => r.uuid === selected) ?? rows[0] ?? null;

  if (listQ.isLoading) return <QuietLoading />;
  if (listQ.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load exposures. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="oh-imm-exposures-panel">
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" className="h-8" onClick={() => seed.mutate()} disabled={seed.isPending}>
          Seed exposure types
        </SecondaryButton>
        {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Log exposure</h3>
        <p className="text-sm text-muted-foreground">
          Quick log — clocks start from exposure time. HIV PEP target ≤2h (max 72h); HBIG ≤24h (max 7d).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 min-w-[12rem] flex-1 rounded border px-2 text-sm"
            placeholder="Employee UUID"
            value={form.customer_uuid}
            onChange={(e) => setForm((f) => ({ ...f, customer_uuid: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="h-9 rounded border px-2 text-sm"
            value={form.exposed_at}
            onChange={(e) => setForm((f) => ({ ...f, exposed_at: e.target.value }))}
          />
          <select
            className="h-9 rounded border px-2 text-sm"
            value={form.exposure_type}
            onChange={(e) => setForm((f) => ({ ...f, exposure_type: e.target.value }))}
          >
            <option value="needlestick">Needlestick</option>
            <option value="sharps">Sharps</option>
            <option value="splash_mucous">Splash (mucous)</option>
            <option value="bite">Bite</option>
            <option value="airborne">Airborne</option>
            <option value="other">Other</option>
          </select>
          <input
            className="h-9 w-28 rounded border px-2 text-sm"
            placeholder="Body site"
            value={form.body_site}
            onChange={(e) => setForm((f) => ({ ...f, body_site: e.target.value }))}
          />
          <input
            className="h-9 w-28 rounded border px-2 text-sm"
            placeholder="Device"
            value={form.device}
            onChange={(e) => setForm((f) => ({ ...f, device: e.target.value }))}
          />
          <select
            className="h-9 rounded border px-2 text-sm"
            value={form.source_known}
            onChange={(e) => setForm((f) => ({ ...f, source_known: e.target.value }))}
          >
            <option value="unknown">Source unknown</option>
            <option value="known">Source known</option>
          </select>
          <label className="flex h-9 items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={form.first_aid_done}
              onChange={(e) => setForm((f) => ({ ...f, first_aid_done: e.target.checked }))}
            />
            First aid done
          </label>
          <input
            className="h-9 w-28 rounded border px-2 text-sm"
            placeholder="Site"
            value={form.site}
            onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
          />
          <PrimaryButton type="button" className="h-9" onClick={() => create.mutate()} disabled={create.isPending}>
            Log incident
          </PrimaryButton>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Open incidents</h3>
        {listQ.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!listQ.isLoading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open exposures. Log one above.</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">When</th>
                <th className="py-1 pr-3 font-medium">Who</th>
                <th className="py-1 pr-3 font-medium">Type</th>
                <th className="py-1 pr-3 font-medium">Band</th>
                <th className="py-1 font-medium">Clocks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: OhImmExposure) => (
                <tr
                  key={r.uuid}
                  className={`cursor-pointer border-b border-border/60 ${selected === r.uuid ? "bg-primary/5" : ""}`}
                  onClick={() => setSelected(r.uuid)}
                >
                  <td className="py-1.5 pr-3 whitespace-nowrap">{r.exposed_at?.slice(0, 16).replace("T", " ")}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{r.customer_initials}</td>
                  <td className="py-1.5 pr-3">{r.exposure_type}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={
                        r.triage_band === "urgent"
                          ? "text-red-700"
                          : r.triage_band === "high"
                            ? "text-amber-700"
                            : ""
                      }
                    >
                      {r.triage_band}
                    </span>
                  </td>
                  <td className="py-1.5 text-xs">
                    {(r.clocks ?? [])
                      .map((c) => `${c.label}: ${formatClock(c.seconds_remaining)}`)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {active ? (
        <section className="space-y-2 border-t border-border/60 pt-4">
          <h3 className="text-sm font-semibold text-primary">
            Incident actions · {active.exposure_type} · RCA {active.rca_uuid?.slice(0, 8)}
          </h3>
          <div className="flex flex-wrap gap-2">
            {["pep", "hbig", "vaccine", "tetanus", "lab_baseline", "consent_exposed"].map((a) => (
              <SecondaryButton
                key={a}
                type="button"
                className="h-8"
                onClick={() =>
                  void recordOhImmExposureAction(active.uuid, {
                    action_type: a,
                    consent_captured: a === "consent_exposed" || a === "lab_baseline",
                    performed_by: "OH",
                  })
                    .then(() => {
                      setMsg(`Recorded ${a}`);
                      void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
                    })
                    .catch((e: Error) => setMsg(e.message))
                }
              >
                {a === "pep" ? "HIV PEP" : a === "lab_baseline" ? "Baseline labs" : a.toUpperCase()}
              </SecondaryButton>
            ))}
            {active.source_known === "known" || active.source ? (
              <>
                <SecondaryButton
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void updateOhImmExposureSource(active.uuid, { consent_status: "given", legal_basis_note: "Consent obtained" })
                      .then(() => setMsg("Source consent: given"))
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  Source consent given
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  className="h-8"
                  onClick={() =>
                    void updateOhImmExposureSource(active.uuid, { consent_status: "refused" })
                      .then(() => setMsg("Source consent: refused"))
                      .catch((e: Error) => setMsg(e.message))
                  }
                >
                  Source refused
                </SecondaryButton>
              </>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            Billable PEP/HBIG/vaccine/labs need a visit on the incident (encounter_uuid). Actions without a product UUID are recorded without billing.
          </div>
          {(active.followups ?? []).length > 0 ? (
            <div className="pt-2">
              <p className="text-sm font-medium">Follow-ups</p>
              <ul className="text-sm text-muted-foreground">
                {(active.followups as Array<Record<string, unknown>>).map((f) => (
                  <li key={String(f.uuid)} className="flex flex-wrap items-center gap-2 py-0.5">
                    <span>
                      {String(f.label)} · due {String(f.due_date)} · {String(f.status)}
                    </span>
                    {f.status !== "done" ? (
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() =>
                          void completeOhImmExposureFollowup(String(f.uuid)).then(() => {
                            void qc.invalidateQueries({ queryKey: ["oh-imm-exposures"] });
                            void qc.invalidateQueries({ queryKey: ["oh-imm-exp-followups"] });
                          })
                        }
                      >
                        Mark done
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Due follow-up labs</h3>
        {(followQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No exposure follow-ups due in the next 30 days.</p>
        ) : (
          <ul className="text-sm">
            {(followQ.data ?? []).map((f) => (
              <li key={String(f.uuid)} className="border-b border-border/60 py-1">
                {String(f.customer_initials)} · {String(f.label)} · {String(f.due_date)} · {String(f.exposure_type)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">24/7 on-call</h3>
        <p className="text-sm text-muted-foreground">
          Escalation list per site/shift. Notifications use the reminder channels; skipped_unconfigured when mail/SMS env is empty.
        </p>
        <ul className="text-sm">
          {(oncallQ.data ?? []).map((c) => (
            <li key={String(c.uuid)} className="border-b border-border/60 py-1">
              #{String(c.escalation_order)} {String(c.name)} · {String(c.site) || "any site"} · {String(c.shift)} ·{" "}
              {String(c.phone) || "—"} · {String(c.email) || "—"}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-8 w-32 rounded border px-2 text-sm"
            placeholder="Name"
            value={oncall.name}
            onChange={(e) => setOncall((o) => ({ ...o, name: e.target.value }))}
          />
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Phone"
            value={oncall.phone}
            onChange={(e) => setOncall((o) => ({ ...o, phone: e.target.value }))}
          />
          <input
            className="h-8 w-40 rounded border px-2 text-sm"
            placeholder="Email"
            value={oncall.email}
            onChange={(e) => setOncall((o) => ({ ...o, email: e.target.value }))}
          />
          <input
            className="h-8 w-24 rounded border px-2 text-sm"
            placeholder="Site"
            value={oncall.site}
            onChange={(e) => setOncall((o) => ({ ...o, site: e.target.value }))}
          />
          <select
            className="h-8 rounded border px-2 text-sm"
            value={oncall.shift}
            onChange={(e) => setOncall((o) => ({ ...o, shift: e.target.value }))}
          >
            <option value="any">Any shift</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
            <option value="weekend">Weekend</option>
          </select>
          <PrimaryButton type="button" className="h-8" onClick={() => addOncall.mutate()} disabled={addOncall.isPending}>
            Add contact
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}


