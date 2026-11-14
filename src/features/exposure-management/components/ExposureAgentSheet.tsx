"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import type { ExposureAgent, LimitBasis } from "@/features/exposure-management/exposure.types";
import { errorMessage, formatDate, formatNumber } from "@/features/exposure-management/lib/exposure-format";
import { useExposureMeta } from "@/features/exposure-management/lib/useExposureMeta";
import { addLimit, archiveLimit, createAgent, exposureKeys, replaceLimit, setAgentComponents, updateAgent } from "@/features/exposure-management/services/exposure.service";

/** Create or edit an agent, manage its limit history (edits add a new version) and the exam components its overexposure triggers. */
export function ExposureAgentSheet({ agent, onClose }: { agent?: ExposureAgent; onClose: () => void }) {
  const qc = useQueryClient();
  const meta = useExposureMeta();
  const [form, setForm] = useState({
    code: agent?.code ?? "",
    name: agent?.name ?? "",
    category: agent?.category ?? "chemical",
    cas_number: agent?.cas_number ?? "",
    molecular_weight: agent?.molecular_weight?.toString() ?? "",
    default_unit: agent?.default_unit ?? "",
  });
  const [limit, setLimit] = useState({ basis: "twa" as LimitBasis, value: "", unit: agent?.default_unit ?? "", standard_name: "", citation: "", jurisdiction: "" });
  const [components, setComponents] = useState((agent?.components ?? []).join(", "));
  const [message, setMessage] = useState("");
  const [edit, setEdit] = useState<{ uuid: string; value: string } | null>(null);
  const done = () => void qc.invalidateQueries({ queryKey: exposureKeys.agents });
  const fail = (fallback: string) => (e: unknown) => setMessage(errorMessage(e, fallback));

  const save = useMutation({
    mutationFn: () => {
      const input = { ...form, molecular_weight: form.molecular_weight ? Number(form.molecular_weight) : null };
      return agent ? updateAgent(agent.uuid, input) : createAgent(input);
    },
    onSuccess: () => { done(); if (!agent) onClose(); else setMessage("Saved."); },
    onError: fail("Could not save the agent. Only administrators can change the library."),
  });
  const add = useMutation({
    mutationFn: () => addLimit(agent!.uuid, { ...limit, value: Number(limit.value) }),
    onSuccess: () => { done(); setMessage("Limit added."); setLimit((l) => ({ ...l, value: "", citation: "" })); },
    onError: fail("Could not add the limit."),
  });
  const supersede = useMutation({
    mutationFn: ({ uuid, value }: { uuid: string; value: number }) => replaceLimit(uuid, { value }),
    onSuccess: () => { done(); setEdit(null); setMessage("New limit version saved; the previous one is kept in history."); },
    onError: fail("Could not replace the limit."),
  });
  const retire = useMutation({ mutationFn: (uuid: string) => archiveLimit(uuid), onSuccess: done, onError: fail("Could not retire the limit.") });
  const mapComponents = useMutation({
    mutationFn: () => setAgentComponents(agent!.uuid, components.split(",").map((c) => c.trim()).filter(Boolean)),
    onSuccess: () => { done(); setMessage("Exam components saved."); },
    onError: fail("Could not save the exam components."),
  });

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const current = (agent?.limits ?? []).filter((l) => l.is_current);

  return (
    <Drawer title={agent ? agent.name : "New agent"} description="Limits are versioned: changing one keeps the old value in history." onClose={onClose} wide>
      <Field label="Code" required value={form.code} onChange={set("code")} />
      <Field label="Name" required value={form.name} onChange={set("name")} />
      <SelectField label="Category" required value={form.category} onChange={set("category")}>
        {(meta.data?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
      </SelectField>
      <Field label="CAS number" value={form.cas_number} onChange={set("cas_number")} />
      <Field label="Molecular weight (g/mol)" type="number" value={form.molecular_weight} onChange={set("molecular_weight")} />
      <SelectField label="Default unit" required value={form.default_unit} onChange={set("default_unit")}>
        <option value="">Choose…</option>
        {(meta.data?.units ?? []).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
      </SelectField>
      <SecondaryButton type="button" disabled={save.isPending || !form.code.trim() || !form.name.trim() || !form.default_unit} onClick={() => save.mutate()}>
        {agent ? "Save agent" : "Create agent"}
      </SecondaryButton>

      {agent ? (
        <>
          <p className="pt-2 text-sm font-medium text-brand-navy">Current limits</p>
          {current.length === 0 ? <p className="text-[13px] text-dash-muted">No limits yet. Without a limit, results cannot be evaluated.</p> : null}
          <ul className="space-y-1.5">
            {current.map((l) => (
              <li key={l.uuid} className="rounded-md border border-dash-border px-3 py-2 text-[13px]">
                <span className="font-medium uppercase">{l.basis}</span> {formatNumber(l.value)} {l.unit}
                <span className="block text-dash-muted">{l.standard_name || "No standard named"} · {l.citation || "no citation"} · since {formatDate(l.valid_from)}</span>
                {edit?.uuid === l.uuid ? (
                  <span className="mr-3 inline-flex items-center gap-1.5">
                    <input aria-label="New limit value" type="number" className="h-7 w-24 rounded border border-dash-border px-2" value={edit.value} onChange={(e) => setEdit({ uuid: l.uuid, value: e.target.value })} />
                    <button type="button" disabled={!(Number(edit.value) > 0) || supersede.isPending} className="font-medium text-brand-primary hover:underline disabled:opacity-50" onClick={() => supersede.mutate({ uuid: l.uuid, value: Number(edit.value) })}>Save version</button>
                    <button type="button" className="text-dash-muted hover:underline" onClick={() => setEdit(null)}>Cancel</button>
                  </span>
                ) : (
                  <button type="button" className="mr-3 font-medium text-brand-primary hover:underline" onClick={() => setEdit({ uuid: l.uuid, value: String(l.value) })}>Change value</button>
                )}
                <button type="button" className="font-medium text-red-700 hover:underline" onClick={() => retire.mutate(l.uuid)}>Retire</button>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-sm font-medium text-brand-navy">Add limit</p>
          <SelectField label="Basis" value={limit.basis} onChange={(v) => setLimit((l) => ({ ...l, basis: v as LimitBasis }))}>
            {(meta.data?.bases ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
          </SelectField>
          <Field label="Value" type="number" value={limit.value} onChange={(v) => setLimit((l) => ({ ...l, value: v }))} />
          <SelectField label="Unit" value={limit.unit} onChange={(v) => setLimit((l) => ({ ...l, unit: v }))}>
            {(meta.data?.units ?? []).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </SelectField>
          <Field label="Standard" value={limit.standard_name} onChange={(v) => setLimit((l) => ({ ...l, standard_name: v }))} />
          <Field label="Citation" value={limit.citation} onChange={(v) => setLimit((l) => ({ ...l, citation: v }))} />
          <Field label="Jurisdiction" value={limit.jurisdiction} onChange={(v) => setLimit((l) => ({ ...l, jurisdiction: v }))} />
          <SecondaryButton type="button" disabled={add.isPending || !limit.value || !limit.unit} onClick={() => add.mutate()}>Add limit</SecondaryButton>

          <p className="pt-2 text-sm font-medium text-brand-navy">Exam components triggered on overexposure</p>
          <Field label="Component codes, comma separated (e.g. AUDIO, SPIRO)" value={components} onChange={setComponents} />
          <SecondaryButton type="button" disabled={mapComponents.isPending} onClick={() => mapComponents.mutate()}>Save components</SecondaryButton>
        </>
      ) : null}
      {message ? <p role="status" className="text-[13px] text-brand-slate">{message}</p> : null}
      <DrawerActions>
        <PrimaryButton type="button" onClick={onClose}>Done</PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
