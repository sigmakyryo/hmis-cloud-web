"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { Field, SelectField } from "../shared/Field";
import { ImmScoreChip } from "../shared/ImmVisuals";
import { ImmStatusBadge, humanize } from "../shared/ImmRecordTable";
import { riskBand } from "./RiskMatrix";
import {
  type OhImmPathway,
  type OhImmTask,
  assignOhImmTask,
  createOhImmNrProtocol,
  createOhImmPathway,
  createOhImmTask,
} from "@/features/occupational-health/services/immunisation.service";

type SheetProps = { onClose: () => void; onDone: (message: string) => void };

const LEVEL_HINT: Record<string, string> = {
  "1": "1 · Rare",
  "2": "2 · Unlikely",
  "3": "3 · Possible",
  "4": "4 · Likely",
  "5": "5 · Almost certain",
};
const SEVERITY_HINT: Record<string, string> = {
  "1": "1 · Minor",
  "2": "2 · Moderate",
  "3": "3 · Serious",
  "4": "4 · Major",
  "5": "5 · Critical",
};

export function PathwaySheet({ onClose, onDone }: SheetProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: "", name: "", description: "", vaccine_codes: "", titre: false });
  const save = useMutation({
    mutationFn: () => {
      const codes = form.vaccine_codes
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean);
      return createOhImmPathway({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        requirements: codes.map((vaccine_code) => ({
          vaccine_code,
          schedule_code: "",
          titre_required: form.titre && vaccine_code === "HEPB",
          control_codes: [],
        })),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["oh-imm-pathways"] });
      onDone("Pathway added.");
    },
  });
  return (
    <Drawer title="Add pathway" description="Groups the vaccines and controls for one kind of exposure." onClose={onClose}>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label="Code" required value={form.code} onChange={(value) => setForm((f) => ({ ...f, code: value }))} />
        <Field label="Name" required value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} />
      </div>
      <Field label="Description" value={form.description} onChange={(value) => setForm((f) => ({ ...f, description: value }))} />
      <Field
        label="Vaccine codes"
        placeholder="HEPB, TDAP"
        value={form.vaccine_codes}
        onChange={(value) => setForm((f) => ({ ...f, vaccine_codes: value }))}
      />
      <label className="flex items-center gap-2 text-[13px] text-brand-slate">
        <input type="checkbox" checked={form.titre} onChange={(e) => setForm((f) => ({ ...f, titre: e.target.checked }))} />
        Require a HepB titre check after the series
      </label>
      {save.error ? <p className="text-[13px] text-destructive" role="alert">{save.error.message}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending || !form.code.trim() || !form.name.trim()} onClick={() => save.mutate()}>
          Add pathway
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}

export function TaskSheet({ pathways, pathwayUuid = "", onClose, onDone }: SheetProps & { pathways: OhImmPathway[]; pathwayUuid?: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ pathway_uuid: pathwayUuid, code: "", name: "", likelihood: "3", severity: "3" });
  const score = Number(form.likelihood) * Number(form.severity);
  const save = useMutation({
    mutationFn: () =>
      createOhImmTask({
        pathway_uuid: form.pathway_uuid,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        likelihood: Number(form.likelihood),
        severity: Number(form.severity),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["oh-imm-tasks"] });
      onDone("Task added.");
    },
  });
  return (
    <Drawer title="Add task" description="Score how likely exposure is and how severe the outcome would be." onClose={onClose}>
      <SelectField label="Pathway" required value={form.pathway_uuid} onChange={(value) => setForm((f) => ({ ...f, pathway_uuid: value }))}>
        <option value="">Select a pathway</option>
        {pathways.map((pathway) => (
          <option key={pathway.uuid} value={pathway.uuid}>
            {pathway.name} ({pathway.code})
          </option>
        ))}
      </SelectField>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <Field label="Code" required value={form.code} onChange={(value) => setForm((f) => ({ ...f, code: value }))} />
        <Field label="Name" required value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Likelihood" required value={form.likelihood} onChange={(value) => setForm((f) => ({ ...f, likelihood: value }))}>
          {Object.entries(LEVEL_HINT).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectField>
        <SelectField label="Severity" required value={form.severity} onChange={(value) => setForm((f) => ({ ...f, severity: value }))}>
          {Object.entries(SEVERITY_HINT).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </SelectField>
      </div>
      <div className="flex items-center gap-3 rounded-lg border border-dash-border bg-dash-canvas/40 px-3 py-2.5">
        <ImmScoreChip score={score} />
        <div className="text-[13px]">
          <p className="font-medium text-brand-navy">Risk score {score} of 25</p>
          <p className="text-dash-muted">Likelihood × severity</p>
        </div>
        <span className="ml-auto">
          <ImmStatusBadge status={riskBand(score)} />
        </span>
      </div>
      {save.error ? <p className="text-[13px] text-destructive" role="alert">{save.error.message}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={save.isPending || !form.pathway_uuid || !form.code.trim() || !form.name.trim()}
          onClick={() => save.mutate()}
        >
          Add task
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}

export function AssignSheet({ tasks, taskUuids, onClose, onDone }: SheetProps & { tasks: OhImmTask[]; taskUuids: string[] }) {
  const [form, setForm] = useState({ task_uuid: taskUuids[0] ?? "", department_name: "", site: "", customer_uuid: "" });
  const bulk = taskUuids.length > 1;
  const targets = bulk ? taskUuids : form.task_uuid ? [form.task_uuid] : [];
  const selectedTasks = tasks.filter((task) => taskUuids.includes(task.uuid));
  const hasTarget = Boolean(form.department_name.trim() || form.site.trim() || form.customer_uuid.trim());
  const save = useMutation({
    mutationFn: () =>
      Promise.all(
        targets.map((task_uuid) =>
          assignOhImmTask({
            task_uuid,
            department_name: form.department_name.trim() || undefined,
            site: form.site.trim() || undefined,
            customer_uuid: form.customer_uuid.trim() || undefined,
          }),
        ),
      ),
    onSuccess: () => onDone(bulk ? `${targets.length} tasks assigned.` : "Task assigned."),
  });
  return (
    <Drawer
      title={bulk ? `Assign ${taskUuids.length} tasks` : "Assign task"}
      description="Assign to a department or site. Add an employee to assign to one person only."
      onClose={onClose}
    >
      {bulk ? (
        <ul className="max-h-40 divide-y divide-dash-border/70 overflow-y-auto rounded-lg border border-dash-border">
          {selectedTasks.map((task) => (
            <li key={task.uuid} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
              <ImmScoreChip score={task.score} />
              <span className="truncate text-brand-navy">{task.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <SelectField label="Task" required value={form.task_uuid} onChange={(value) => setForm((f) => ({ ...f, task_uuid: value }))}>
          <option value="">Select a task</option>
          {tasks.map((task) => (
            <option key={task.uuid} value={task.uuid}>
              {task.name} ({task.code})
            </option>
          ))}
        </SelectField>
      )}
      <Field label="Department" value={form.department_name} onChange={(value) => setForm((f) => ({ ...f, department_name: value }))} />
      <Field label="Site" value={form.site} onChange={(value) => setForm((f) => ({ ...f, site: value }))} />
      <Field label="Employee ID" value={form.customer_uuid} onChange={(value) => setForm((f) => ({ ...f, customer_uuid: value }))} />
      {save.error ? <p className="text-[13px] text-destructive" role="alert">{save.error.message}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending || targets.length === 0 || !hasTarget} onClick={() => save.mutate()}>
          Assign
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}

export function ProtocolSheet({ onClose, onDone }: SheetProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ vaccine_code: "HEPB", titre_threshold: "10", max_series: "2", titre_interval_days: "28" });
  const save = useMutation({
    mutationFn: () =>
      createOhImmNrProtocol({
        vaccine_code: form.vaccine_code.trim().toUpperCase(),
        titre_threshold: Number(form.titre_threshold),
        max_series: Number(form.max_series),
        titre_interval_days: Number(form.titre_interval_days),
        flag_on_true_non_responder: true,
        recommend_role_change: true,
        recommend_ppe_plan: true,
        enable_hbig_fast_track: true,
        require_quantitative_titre: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["oh-imm-nr-protocols"] });
      onDone("Non-responder protocol saved.");
    },
  });
  return (
    <Drawer
      title="Add non-responder protocol"
      description="What happens after a failed titre: repeat the series, re-test, then flag a true non-responder."
      onClose={onClose}
    >
      <Field label="Vaccine code" required value={form.vaccine_code} onChange={(value) => setForm((f) => ({ ...f, vaccine_code: value }))} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Titre threshold" type="number" required value={form.titre_threshold} onChange={(value) => setForm((f) => ({ ...f, titre_threshold: value }))} />
        <Field label="Max series" type="number" required value={form.max_series} onChange={(value) => setForm((f) => ({ ...f, max_series: value }))} />
        <Field label="Re-test after (days)" type="number" value={form.titre_interval_days} onChange={(value) => setForm((f) => ({ ...f, titre_interval_days: value }))} />
      </div>
      <p className="text-[13px] text-dash-muted">
        True non-responders are flagged with a role-change review, a PPE plan, and HBIG fast-track after exposure.
      </p>
      {save.error ? <p className="text-[13px] text-destructive" role="alert">{save.error.message}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={save.isPending || !form.vaccine_code.trim()} onClick={() => save.mutate()}>
          Save protocol
        </PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}

/** Read-only pathway view with its requirements and scored tasks. */
export function PathwayDetailSheet({
  pathway,
  tasks,
  onClose,
  onAddTask,
  onOpenTask,
}: {
  pathway: OhImmPathway;
  tasks: OhImmTask[];
  onClose: () => void;
  onAddTask: () => void;
  onOpenTask: (task: OhImmTask) => void;
}) {
  return (
    <Drawer wide title={pathway.name} description={pathway.description || `Pathway ${pathway.code}`} onClose={onClose}>
      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Requirements</p>
        {pathway.requirements.length === 0 ? (
          <p className="text-[13px] text-dash-muted">No vaccine requirements yet.</p>
        ) : (
          <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
            {pathway.requirements.map((req, index) => (
              <li key={req.uuid ?? `${req.vaccine_code}-${index}`} className="flex flex-wrap items-center gap-2 py-2 text-[13px]">
                <span className="rounded-md bg-brand-tint px-2 py-0.5 font-mono text-[12px] font-semibold text-brand-primary">
                  {req.vaccine_code}
                </span>
                {req.schedule_code ? <span className="text-dash-muted">Schedule {req.schedule_code}</span> : null}
                {req.titre_required ? <ImmStatusBadge status="pending" label="Titre check" /> : null}
                {(req.control_codes ?? []).map((control) => (
                  <span key={control} className="rounded-full border border-dash-border px-2 py-0.5 text-[12px] text-brand-slate">
                    {humanize(control)}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-brand-navy">Tasks ({tasks.length})</p>
          <button type="button" className="text-[13px] font-medium text-brand-primary hover:underline" onClick={onAddTask}>
            Add task
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-[13px] text-dash-muted">No tasks scored on this pathway yet.</p>
        ) : (
          <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
            {tasks.toSorted((a, b) => b.score - a.score).map((task) => (
              <li key={task.uuid}>
                <button
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="flex w-full items-center gap-3 py-2 text-left hover:bg-brand-tint/40"
                >
                  <ImmScoreChip score={task.score} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-brand-navy">{task.name}</span>
                    <span className="block text-[12px] text-dash-muted">
                      {task.code} · L{task.likelihood} × S{task.severity}
                    </span>
                  </span>
                  <ImmStatusBadge status={riskBand(task.score)} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Drawer>
  );
}

/** Task detail with the score broken down and a shortcut to assign. */
export function TaskDetailSheet({ task, onClose, onAssign }: { task: OhImmTask; onClose: () => void; onAssign: () => void }) {
  return (
    <Drawer title={task.name} description={task.description || `Task ${task.code}`} onClose={onClose}>
      <div className="flex items-center gap-3 rounded-lg border border-dash-border bg-dash-canvas/40 px-3 py-3">
        <ImmScoreChip score={task.score} />
        <div className="text-[13px]">
          <p className="font-medium text-brand-navy">Risk score {task.score} of 25</p>
          <p className="text-dash-muted">
            {LEVEL_HINT[String(task.likelihood)] ?? task.likelihood} likelihood ·{" "}
            {SEVERITY_HINT[String(task.severity)] ?? task.severity} severity
          </p>
        </div>
        <span className="ml-auto">
          <ImmStatusBadge status={riskBand(task.score)} />
        </span>
      </div>
      <dl className="divide-y divide-dash-border/70 border-y border-dash-border/70 text-[13px]">
        {[
          ["Code", task.code],
          ["Pathway", task.pathway_name ?? task.pathway_code ?? "—"],
          ["Source", task.is_example ? "Example" : "Facility"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <dt className="text-dash-muted">{label}</dt>
            <dd className="text-right text-brand-navy">{value}</dd>
          </div>
        ))}
      </dl>
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
        <PrimaryButton type="button" onClick={onAssign}>Assign task</PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
