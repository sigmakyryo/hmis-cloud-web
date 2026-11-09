"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { QuietLoading } from "../shared/QuietLoading";
import {
  type OhImmNrProtocol,
  type OhImmPathway,
  type OhImmTask,
  assignOhImmTask,
  createOhImmNrProtocol,
  createOhImmPathway,
  createOhImmTask,
  fetchOhImmNrProtocols,
  fetchOhImmPathways,
  fetchOhImmTasks,
  seedOhImmNrHepb,
  seedOhImmRiskExamples,
} from "@/features/occupational-health/services/immunisation.service";

export function RiskTasks() {
  const pathwaysQ = useQuery({ queryKey: ["oh-imm-pathways"], queryFn: fetchOhImmPathways });
  const tasksQ = useQuery({ queryKey: ["oh-imm-tasks"], queryFn: fetchOhImmTasks });
  const protocolsQ = useQuery({ queryKey: ["oh-imm-nr-protocols"], queryFn: fetchOhImmNrProtocols });
  const qc = useQueryClient();
  const [pathwayForm, setPathwayForm] = useState({ code: "", name: "", description: "", vaccine_code: "" });
  const [taskForm, setTaskForm] = useState({
    pathway_uuid: "",
    code: "",
    name: "",
    likelihood: 3,
    severity: 3,
  });
  const [assignForm, setAssignForm] = useState({
    task_uuid: "",
    department_name: "",
    site: "",
    customer_uuid: "",
  });
  const [protocolForm, setProtocolForm] = useState({
    vaccine_code: "HEPB",
    titre_threshold: 10,
    max_series: 2,
    titre_interval_days: 28,
  });
  const [msg, setMsg] = useState("");

  const seedRisk = useMutation({
    mutationFn: seedOhImmRiskExamples,
    onSuccess: (r) => {
      setMsg(`Loaded ${r.pathways} pathways and ${r.tasks} example tasks.`);
      void qc.invalidateQueries({ queryKey: ["oh-imm-pathways"] });
      void qc.invalidateQueries({ queryKey: ["oh-imm-tasks"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const seedNr = useMutation({
    mutationFn: seedOhImmNrHepb,
    onSuccess: () => {
      setMsg("HepB non-responder protocol ready.");
      void qc.invalidateQueries({ queryKey: ["oh-imm-nr-protocols"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const createPathway = useMutation({
    mutationFn: () =>
      createOhImmPathway({
        code: pathwayForm.code,
        name: pathwayForm.name,
        description: pathwayForm.description,
        requirements: pathwayForm.vaccine_code
          ? [
              {
                vaccine_code: pathwayForm.vaccine_code,
                schedule_code: "",
                titre_required: pathwayForm.vaccine_code.toUpperCase() === "HEPB",
                control_codes: [],
              },
            ]
          : [],
      }),
    onSuccess: () => {
      setPathwayForm({ code: "", name: "", description: "", vaccine_code: "" });
      void qc.invalidateQueries({ queryKey: ["oh-imm-pathways"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const createTask = useMutation({
    mutationFn: () => createOhImmTask(taskForm),
    onSuccess: () => {
      setTaskForm({ pathway_uuid: "", code: "", name: "", likelihood: 3, severity: 3 });
      void qc.invalidateQueries({ queryKey: ["oh-imm-tasks"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });
  const assignTask = useMutation({
    mutationFn: () =>
      assignOhImmTask({
        task_uuid: assignForm.task_uuid,
        department_name: assignForm.department_name || undefined,
        site: assignForm.site || undefined,
        customer_uuid: assignForm.customer_uuid || undefined,
      }),
    onSuccess: () => setMsg("Task assigned."),
    onError: (e: Error) => setMsg(e.message),
  });
  const createProtocol = useMutation({
    mutationFn: () =>
      createOhImmNrProtocol({
        ...protocolForm,
        flag_on_true_non_responder: true,
        recommend_role_change: true,
        recommend_ppe_plan: true,
        enable_hbig_fast_track: true,
        require_quantitative_titre: true,
      }),
    onSuccess: () => {
      setMsg("Non-responder protocol saved.");
      void qc.invalidateQueries({ queryKey: ["oh-imm-nr-protocols"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const pathways = pathwaysQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const protocols = protocolsQ.data ?? [];

  if (pathwaysQ.isLoading || tasksQ.isLoading || protocolsQ.isLoading) return <QuietLoading />;
  if (pathwaysQ.isError || tasksQ.isError || protocolsQ.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load risk pathways. Check your connection and try again.
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="oh-imm-risk-panel">
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryButton type="button" className="h-8" onClick={() => seedRisk.mutate()} disabled={seedRisk.isPending}>
          Load example pathways
        </SecondaryButton>
        <SecondaryButton type="button" className="h-8" onClick={() => seedNr.mutate()} disabled={seedNr.isPending}>
          Load HepB non-responder protocol
        </SecondaryButton>
        {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Exposure pathways</h3>
        <p className="text-sm text-muted-foreground">
          Pathways drive required vaccines, titre checks, and controls. Examples are labelled and editable.
        </p>
        {(pathwaysQ.isLoading || pathways.length === 0) && !pathwaysQ.isLoading ? (
          <p className="text-sm text-muted-foreground">
            No pathways yet.{" "}
            <button type="button" className="text-primary underline" onClick={() => seedRisk.mutate()}>
              Load examples
            </button>
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Code</th>
                <th className="py-1 pr-3 font-medium">Name</th>
                <th className="py-1 pr-3 font-medium">Vaccines</th>
                <th className="py-1 font-medium">Controls</th>
              </tr>
            </thead>
            <tbody>
              {pathways.map((p: OhImmPathway) => (
                <tr key={p.uuid} className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono text-xs">
                    {p.code}
                    {p.is_example ? (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">example</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3">{p.name}</td>
                  <td className="py-1.5 pr-3">
                    {p.requirements.map((r) => r.vaccine_code).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-1.5">
                    {Array.from(
                      new Set(p.requirements.flatMap((r) => r.control_codes ?? [])),
                    ).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Code"
            value={pathwayForm.code}
            onChange={(e) => setPathwayForm((f) => ({ ...f, code: e.target.value }))}
          />
          <input
            className="h-8 w-40 rounded border px-2 text-sm"
            placeholder="Name"
            value={pathwayForm.name}
            onChange={(e) => setPathwayForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Vaccine code"
            value={pathwayForm.vaccine_code}
            onChange={(e) => setPathwayForm((f) => ({ ...f, vaccine_code: e.target.value }))}
          />
          <PrimaryButton type="button" className="h-8" onClick={() => createPathway.mutate()} disabled={createPathway.isPending}>
            Add pathway
          </PrimaryButton>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Tasks & scoring</h3>
        <p className="text-sm text-muted-foreground">
          Likelihood × severity (1–5). Assign tasks to departments, sites, roles, or a specific employee.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Task</th>
                <th className="py-1 pr-3 font-medium">Pathway</th>
                <th className="py-1 pr-3 font-medium">L×S</th>
                <th className="py-1 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: OhImmTask) => (
                <tr key={task.uuid} className="border-b border-border/60">
                  <td className="py-1.5 pr-3">
                    <span className="font-mono text-xs">{task.code}</span> {task.name}
                    {task.is_example ? (
                      <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">example</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3">{task.pathway_code ?? "—"}</td>
                  <td className="py-1.5 pr-3">
                    {task.likelihood}×{task.severity}
                  </td>
                  <td className="py-1.5 font-medium">{task.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <select
            className="h-8 rounded border px-2 text-sm"
            value={taskForm.pathway_uuid}
            onChange={(e) => setTaskForm((f) => ({ ...f, pathway_uuid: e.target.value }))}
          >
            <option value="">Pathway…</option>
            {pathways.map((p: OhImmPathway) => (
              <option key={p.uuid} value={p.uuid}>
                {p.code}
              </option>
            ))}
          </select>
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Task code"
            value={taskForm.code}
            onChange={(e) => setTaskForm((f) => ({ ...f, code: e.target.value }))}
          />
          <input
            className="h-8 w-40 rounded border px-2 text-sm"
            placeholder="Name"
            value={taskForm.name}
            onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            type="number"
            min={1}
            max={5}
            className="h-8 w-16 rounded border px-2 text-sm"
            value={taskForm.likelihood}
            onChange={(e) => setTaskForm((f) => ({ ...f, likelihood: Number(e.target.value) }))}
          />
          <input
            type="number"
            min={1}
            max={5}
            className="h-8 w-16 rounded border px-2 text-sm"
            value={taskForm.severity}
            onChange={(e) => setTaskForm((f) => ({ ...f, severity: Number(e.target.value) }))}
          />
          <PrimaryButton type="button" className="h-8" onClick={() => createTask.mutate()} disabled={createTask.isPending}>
            Add task
          </PrimaryButton>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <select
            className="h-8 rounded border px-2 text-sm"
            value={assignForm.task_uuid}
            onChange={(e) => setAssignForm((f) => ({ ...f, task_uuid: e.target.value }))}
          >
            <option value="">Assign task…</option>
            {tasks.map((task: OhImmTask) => (
              <option key={task.uuid} value={task.uuid}>
                {task.code}
              </option>
            ))}
          </select>
          <input
            className="h-8 w-36 rounded border px-2 text-sm"
            placeholder="Department"
            value={assignForm.department_name}
            onChange={(e) => setAssignForm((f) => ({ ...f, department_name: e.target.value }))}
          />
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Site"
            value={assignForm.site}
            onChange={(e) => setAssignForm((f) => ({ ...f, site: e.target.value }))}
          />
          <input
            className="h-8 w-52 rounded border px-2 text-sm"
            placeholder="Employee UUID (override)"
            value={assignForm.customer_uuid}
            onChange={(e) => setAssignForm((f) => ({ ...f, customer_uuid: e.target.value }))}
          />
          <SecondaryButton type="button" className="h-8" onClick={() => assignTask.mutate()} disabled={assignTask.isPending}>
            Assign
          </SecondaryButton>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">Non-responder protocols</h3>
        <p className="text-sm text-muted-foreground">
          After series + quantitative titre: 1st fail → second series; 2nd fail → true non-responder with HBIG fast-track.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-medium">Vaccine</th>
                <th className="py-1 pr-3 font-medium">Threshold</th>
                <th className="py-1 pr-3 font-medium">Max series</th>
                <th className="py-1 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p: OhImmNrProtocol) => (
                <tr key={p.uuid} className="border-b border-border/60">
                  <td className="py-1.5 pr-3 font-mono text-xs">{p.vaccine_code}</td>
                  <td className="py-1.5 pr-3">
                    {p.titre_threshold} {p.titre_unit}
                  </td>
                  <td className="py-1.5 pr-3">{p.max_series}</td>
                  <td className="py-1.5 text-xs text-muted-foreground">
                    {[
                      p.flag_on_true_non_responder ? "flag" : null,
                      p.recommend_role_change ? "role change" : null,
                      p.recommend_ppe_plan ? "PPE plan" : null,
                      p.enable_hbig_fast_track ? "HBIG fast-track" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            className="h-8 w-28 rounded border px-2 text-sm"
            placeholder="Vaccine"
            value={protocolForm.vaccine_code}
            onChange={(e) => setProtocolForm((f) => ({ ...f, vaccine_code: e.target.value }))}
          />
          <input
            type="number"
            className="h-8 w-24 rounded border px-2 text-sm"
            placeholder="Threshold"
            value={protocolForm.titre_threshold}
            onChange={(e) => setProtocolForm((f) => ({ ...f, titre_threshold: Number(e.target.value) }))}
          />
          <input
            type="number"
            className="h-8 w-20 rounded border px-2 text-sm"
            placeholder="Max series"
            value={protocolForm.max_series}
            onChange={(e) => setProtocolForm((f) => ({ ...f, max_series: Number(e.target.value) }))}
          />
          <PrimaryButton type="button" className="h-8" onClick={() => createProtocol.mutate()} disabled={createProtocol.isPending}>
            Save protocol
          </PrimaryButton>
        </div>
      </section>
    </div>
  );
}


