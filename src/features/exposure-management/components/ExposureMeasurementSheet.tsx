"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { measurementFormSchema } from "@/features/exposure-management/lib/measurement.schema";
import { errorMessage } from "@/features/exposure-management/lib/exposure-format";
import { useExposureMeta } from "@/features/exposure-management/lib/useExposureMeta";
import { createMeasurement, exposureKeys, fetchAgents, fetchGroups, fetchInstruments } from "@/features/exposure-management/services/exposure.service";
import type { SampleType } from "@/features/exposure-management/exposure.types";

export function ExposureMeasurementSheet({ onClose, defaults }: { onClose: () => void; defaults?: { group_uuid?: string; agent_uuid?: string } }) {
  const qc = useQueryClient();
  const meta = useExposureMeta();
  const groups = useQuery({ queryKey: exposureKeys.groups, queryFn: () => fetchGroups() });
  const agents = useQuery({ queryKey: exposureKeys.agents, queryFn: () => fetchAgents() });
  const instruments = useQuery({ queryKey: exposureKeys.instruments, queryFn: fetchInstruments });
  const [form, setForm] = useState({
    group_uuid: defaults?.group_uuid ?? "",
    agent_uuid: defaults?.agent_uuid ?? "",
    instrument_uuid: "",
    sample_type: "personal" as SampleType,
    sampled_at: new Date().toISOString().slice(0, 16),
    duration_minutes: "480",
    result_value: "",
    result_unit: "",
    below_lod: false,
    lod_value: "",
    location: "",
    method: "",
    lab_name: "",
    lab_ref: "",
    pending_lab: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const set = <K extends keyof typeof form>(key: K) => (value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const agent = agents.data?.find((a) => a.uuid === form.agent_uuid);

  const save = useMutation({
    mutationFn: () =>
      createMeasurement({
        group_uuid: form.group_uuid,
        agent_uuid: form.agent_uuid,
        instrument_uuid: form.instrument_uuid || null,
        sample_type: form.sample_type,
        sampled_at: new Date(form.sampled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        result_value: Number(form.result_value),
        result_unit: form.result_unit,
        below_lod: form.below_lod,
        lod_value: form.below_lod ? Number(form.lod_value) : null,
        location: form.location,
        method: form.method,
        lab_name: form.lab_name,
        lab_ref: form.lab_ref,
        status: form.pending_lab ? "pending_lab" : "valid",
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: exposureKeys.all });
      onClose();
    },
    onError: (e) => setServerError(errorMessage(e, "Could not record the result.")),
  });

  const submit = () => {
    const parsed = measurementFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setServerError("");
    save.mutate();
  };
  const err = (key: string) => (errors[key] ? <p role="alert" className="-mt-1 text-[12px] text-red-700">{errors[key]}</p> : null);

  return (
    <Drawer title="Record exposure result" description="Compared against the agent's current limits when saved." onClose={onClose} wide>
      <SelectField label="Group" required value={form.group_uuid} onChange={set("group_uuid")}>
        <option value="">Choose…</option>
        {(groups.data ?? []).map((g) => <option key={g.uuid} value={g.uuid}>{g.name}</option>)}
      </SelectField>
      {err("group_uuid")}
      <SelectField label="Agent" required value={form.agent_uuid} onChange={(value) => setForm((f) => ({ ...f, agent_uuid: value, result_unit: agents.data?.find((a) => a.uuid === value)?.default_unit ?? f.result_unit }))}>
        <option value="">Choose…</option>
        {(agents.data ?? []).filter((a) => a.is_active).map((a) => <option key={a.uuid} value={a.uuid}>{a.name}</option>)}
      </SelectField>
      {err("agent_uuid")}
      <SelectField label="Sample type" required value={form.sample_type} onChange={(v) => set("sample_type")(v as SampleType)}>
        {(meta.data?.sample_types ?? ["personal", "area", "biological"]).map((t) => <option key={t} value={t}>{t}</option>)}
      </SelectField>
      <Field label="Sampled at" required type="datetime-local" value={form.sampled_at} onChange={set("sampled_at")} />
      {err("sampled_at")}
      <Field label="Duration (minutes)" required type="number" value={form.duration_minutes} onChange={set("duration_minutes")} />
      {err("duration_minutes")}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field label="Result" required type="number" value={form.result_value} onChange={set("result_value")} />
          {err("result_value")}
        </div>
        <SelectField label="Unit" required value={form.result_unit} onChange={set("result_unit")}>
          <option value="">Choose…</option>
          {(meta.data?.units ?? []).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </SelectField>
      </div>
      {err("result_unit")}
      {agent ? <p className="-mt-1 text-[12px] text-dash-muted">Default unit for {agent.name}: {agent.default_unit}</p> : null}
      <CheckField label="Result is below the limit of detection" checked={form.below_lod} onChange={set("below_lod")} />
      {form.below_lod ? <Field label="Limit of detection" required type="number" value={form.lod_value} onChange={set("lod_value")} /> : null}
      {err("lod_value")}
      <SelectField label="Instrument" value={form.instrument_uuid} onChange={set("instrument_uuid")}>
        <option value="">None / lab sample</option>
        {(instruments.data ?? []).filter((i) => i.status !== "retired").map((i) => <option key={i.uuid} value={i.uuid}>{i.name} ({i.serial})</option>)}
      </SelectField>
      <Field label="Location" value={form.location} onChange={set("location")} />
      <Field label="Method" value={form.method} onChange={set("method")} />
      <Field label="Laboratory" value={form.lab_name} onChange={set("lab_name")} />
      <Field label="Lab reference" value={form.lab_ref} onChange={set("lab_ref")} />
      <CheckField label="Lab result still pending" checked={form.pending_lab} onChange={set("pending_lab")} />
      {serverError ? <p role="alert" className="text-[13px] text-red-700">{serverError}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending} onClick={submit}>{save.isPending ? "Saving…" : "Record result"}</PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
