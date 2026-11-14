"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { errorMessage } from "@/features/exposure-management/lib/exposure-format";
import { createInstrument, createPlan, exposureKeys, fetchAgents, fetchGroups } from "@/features/exposure-management/services/exposure.service";

export function PlanSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const groups = useQuery({ queryKey: exposureKeys.groups, queryFn: () => fetchGroups() });
  const agents = useQuery({ queryKey: exposureKeys.agents, queryFn: () => fetchAgents() });
  const [form, setForm] = useState({ group_uuid: "", agent_uuid: "", frequency_months: "12", min_samples: "6", method: "", next_due_on: "" });
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const save = useMutation({
    mutationFn: () => createPlan({ ...form, frequency_months: Number(form.frequency_months), min_samples: Number(form.min_samples), next_due_on: form.next_due_on || null }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: exposureKeys.plans }); void qc.invalidateQueries({ queryKey: exposureKeys.dashboard }); onClose(); },
    onError: (e) => setError(errorMessage(e, "Could not save the plan.")),
  });
  return (
    <Drawer title="New sampling plan" description="A plan sets how often a group is sampled for an agent." onClose={onClose}>
      <SelectField label="Group" required value={form.group_uuid} onChange={set("group_uuid")}>
        <option value="">Choose…</option>
        {(groups.data ?? []).map((g) => <option key={g.uuid} value={g.uuid}>{g.name}</option>)}
      </SelectField>
      <SelectField label="Agent" required value={form.agent_uuid} onChange={set("agent_uuid")}>
        <option value="">Choose…</option>
        {(agents.data ?? []).map((a) => <option key={a.uuid} value={a.uuid}>{a.name}</option>)}
      </SelectField>
      <Field label="Every (months)" required type="number" value={form.frequency_months} onChange={set("frequency_months")} />
      <Field label="Minimum samples" required type="number" value={form.min_samples} onChange={set("min_samples")} />
      <Field label="Method" value={form.method} onChange={set("method")} />
      <Field label="Next due" type="date" value={form.next_due_on} onChange={set("next_due_on")} />
      {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending || !form.group_uuid || !form.agent_uuid} onClick={() => save.mutate()}>Save plan</PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}

export function InstrumentSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", serial: "", type: "", manufacturer: "", last_calibrated_on: "", calibration_due_on: "", certificate_ref: "" });
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const save = useMutation({
    mutationFn: () => createInstrument({ ...form, last_calibrated_on: form.last_calibrated_on || null, calibration_due_on: form.calibration_due_on || null }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: exposureKeys.instruments }); void qc.invalidateQueries({ queryKey: exposureKeys.dashboard }); onClose(); },
    onError: (e) => setError(errorMessage(e, "Could not save the instrument.")),
  });
  return (
    <Drawer title="New instrument" description="Results taken with an out-of-calibration instrument are refused." onClose={onClose}>
      <Field label="Name" required value={form.name} onChange={set("name")} />
      <Field label="Serial number" required value={form.serial} onChange={set("serial")} />
      <Field label="Type" value={form.type} onChange={set("type")} />
      <Field label="Manufacturer" value={form.manufacturer} onChange={set("manufacturer")} />
      <Field label="Last calibrated" type="date" value={form.last_calibrated_on} onChange={set("last_calibrated_on")} />
      <Field label="Calibration due" type="date" value={form.calibration_due_on} onChange={set("calibration_due_on")} />
      <Field label="Certificate reference" value={form.certificate_ref} onChange={set("certificate_ref")} />
      {error ? <p role="alert" className="text-[13px] text-red-700">{error}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending || !form.name.trim() || !form.serial.trim()} onClick={() => save.mutate()}>Save instrument</PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
