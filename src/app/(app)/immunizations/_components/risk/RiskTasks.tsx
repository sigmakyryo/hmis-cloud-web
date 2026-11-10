"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { AppIcon } from "@/components/icons/app-icon";
import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { EmptyAction } from "../shared/EmptyAction";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmSelectBox,
  ImmStatusBadge,
  humanize,
} from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmCodeChips, ImmScoreChip } from "../shared/ImmVisuals";
import { LoadError, QuietLoading } from "../shared/QuietLoading";
import { useImmList } from "../shared/use-imm-list";
import { type RiskCell, RiskMatrix, riskBand } from "./RiskMatrix";
import { AssignSheet, PathwayDetailSheet, PathwaySheet, ProtocolSheet, TaskDetailSheet, TaskSheet } from "./RiskSheets";
import {
  type OhImmNrProtocol,
  type OhImmPathway,
  type OhImmTask,
  fetchOhImmNrProtocols,
  fetchOhImmPathways,
  fetchOhImmTasks,
  seedOhImmNrHepb,
  seedOhImmRiskExamples,
} from "@/features/occupational-health/services/immunisation.service";

type RiskView = "pathways" | "tasks" | "protocols";
type RiskSheet =
  | { kind: "pathway" }
  | { kind: "task"; pathwayUuid?: string }
  | { kind: "assign"; taskUuids: string[] }
  | { kind: "protocol" }
  | { kind: "pathway-detail"; uuid: string }
  | { kind: "task-detail"; uuid: string }
  | null;

function pathwayVaccines(pathway: OhImmPathway): string[] {
  return Array.from(new Set(pathway.requirements.map((item) => item.vaccine_code).filter(Boolean)));
}

function pathwayControls(pathway: OhImmPathway): string[] {
  return Array.from(new Set(pathway.requirements.flatMap((item) => item.control_codes ?? [])));
}

export function RiskTasks() {
  const qc = useQueryClient();
  const pathwaysQ = useQuery({ queryKey: ["oh-imm-pathways"], queryFn: fetchOhImmPathways });
  const tasksQ = useQuery({ queryKey: ["oh-imm-tasks"], queryFn: fetchOhImmTasks });
  const protocolsQ = useQuery({ queryKey: ["oh-imm-nr-protocols"], queryFn: fetchOhImmNrProtocols });
  const [view, setView] = useState<RiskView>("pathways");
  const [sheet, setSheet] = useState<RiskSheet>(null);
  const [msg, setMsg] = useState("");
  const [band, setBand] = useState("");
  const [pathwayFilter, setPathwayFilter] = useState("");
  const [cell, setCell] = useState<RiskCell | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const pathways = pathwaysQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const protocols = protocolsQ.data ?? [];

  const tasksByPathway = new Map<string, OhImmTask[]>();
  for (const task of tasks) {
    const key = task.pathway_code ?? "";
    tasksByPathway.set(key, [...(tasksByPathway.get(key) ?? []), task]);
  }
  const filteredTasks = tasks.filter(
    (task) =>
      (!band || riskBand(task.score) === band) &&
      (!pathwayFilter || task.pathway_code === pathwayFilter) &&
      (!cell || (task.likelihood === cell.likelihood && task.severity === cell.severity)),
  );

  const pathwayList = useImmList({
    rows: pathways,
    searchText: (p) => [p.name, p.code, p.description, ...pathwayVaccines(p)].join(" "),
    sortValue: (p, key) =>
      key === "name"
        ? p.name
        : key === "tasks"
          ? (tasksByPathway.get(p.code) ?? []).length
          : Math.max(0, ...(tasksByPathway.get(p.code) ?? []).map((t) => t.score)),
    defaultSort: { key: "name", direction: "asc" },
  });
  const taskList = useImmList({
    rows: filteredTasks,
    searchText: (t) => [t.name, t.code, t.pathway_code, t.pathway_name].join(" "),
    sortValue: (t, key) =>
      key === "name" ? t.name : key === "pathway" ? (t.pathway_name ?? t.pathway_code) : key === "likelihood" ? t.likelihood : key === "severity" ? t.severity : t.score,
    defaultSort: { key: "score", direction: "desc" },
  });
  const protocolList = useImmList({
    rows: protocols,
    searchText: (p) => p.vaccine_code,
    sortValue: (p, key) => (key === "vaccine" ? p.vaccine_code : p.max_series),
    defaultSort: { key: "vaccine", direction: "asc" },
  });

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

  if (pathwaysQ.isLoading || tasksQ.isLoading || protocolsQ.isLoading) return <QuietLoading />;
  if (pathwaysQ.isError || tasksQ.isError || protocolsQ.isError) {
    return <LoadError>Could not load risk pathways. Check your connection and try again.</LoadError>;
  }

  const urgentCount = tasks.filter((t) => riskBand(t.score) === "urgent").length;
  const highCount = tasks.filter((t) => riskBand(t.score) === "high").length;
  const averageScore = tasks.length ? (tasks.reduce((sum, t) => sum + t.score, 0) / tasks.length).toFixed(1) : "—";
  const pageTaskIds = taskList.pageRows.map((t) => t.uuid);
  const pageAllSelected = pageTaskIds.length > 0 && pageTaskIds.every((id) => selected.includes(id));
  const pageSomeSelected = pageTaskIds.some((id) => selected.includes(id));
  const hasTaskFilters = Boolean(band || pathwayFilter || cell || taskList.query);

  const done = (message: string) => {
    setMsg(message);
    setSheet(null);
  };
  const showBand = (next: string) => {
    setView("tasks");
    setCell(null);
    setBand((current) => (current === next ? "" : next));
  };
  const clearTaskFilters = () => {
    setBand("");
    setPathwayFilter("");
    setCell(null);
    taskList.setQuery("");
  };
  const detailPathway = sheet?.kind === "pathway-detail" ? pathways.find((p) => p.uuid === sheet.uuid) : undefined;
  const detailTask = sheet?.kind === "task-detail" ? tasks.find((t) => t.uuid === sheet.uuid) : undefined;

  return (
    <>
      <ImmTabsBar
        testId="oh-imm-risk-panel"
        label="Risk records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "pathways", label: "Exposure pathways", count: pathways.length },
          { key: "tasks", label: "Tasks & scoring", count: tasks.length },
          { key: "protocols", label: "Non-responder protocols", count: protocols.length },
        ]}
        actions={
          view === "pathways" ? (
            <>
              <SecondaryButton type="button" className="h-8" disabled={seedRisk.isPending} onClick={() => seedRisk.mutate()}>
                Load examples
              </SecondaryButton>
              <PageActionButton type="button" onClick={() => setSheet({ kind: "pathway" })}>
                <AppIcon name="add" className="size-3.5" />
                Add pathway
              </PageActionButton>
            </>
          ) : view === "tasks" ? (
            <>
              <SecondaryButton
                type="button"
                className="h-8"
                disabled={tasks.length === 0}
                onClick={() => setSheet({ kind: "assign", taskUuids: selected })}
              >
                {selected.length > 0 ? `Assign selected (${selected.length})` : "Assign task"}
              </SecondaryButton>
              <PageActionButton type="button" disabled={pathways.length === 0} onClick={() => setSheet({ kind: "task" })}>
                <AppIcon name="add" className="size-3.5" />
                Add task
              </PageActionButton>
            </>
          ) : (
            <>
              <SecondaryButton type="button" className="h-8" disabled={seedNr.isPending} onClick={() => seedNr.mutate()}>
                Load HepB protocol
              </SecondaryButton>
              <PageActionButton type="button" onClick={() => setSheet({ kind: "protocol" })}>
                <AppIcon name="add" className="size-3.5" />
                Add protocol
              </PageActionButton>
            </>
          )
        }
      />
      {tasks.length > 0 || pathways.length > 0 ? (
        <ImmInsightStrip
          testId="oh-imm-risk-insights"
          items={[
            { label: "pathways", value: pathways.length },
            { label: "scored tasks", value: tasks.length, hint: `avg ${averageScore}` },
            {
              label: "urgent",
              value: urgentCount,
              tone: urgentCount > 0 ? "danger" : "default",
              hint: "score 15+",
              onSelect: () => showBand("urgent"),
              active: view === "tasks" && band === "urgent",
            },
            {
              label: "high",
              value: highCount,
              tone: highCount > 0 ? "warning" : "default",
              hint: "score 8–14",
              onSelect: () => showBand("high"),
              active: view === "tasks" && band === "high",
            },
            { label: "protocols", value: protocols.length },
          ]}
        />
      ) : null}
      {msg ? <ImmNotice>{msg}</ImmNotice> : null}

      {view === "pathways" ? (
        pathways.length === 0 ? (
          <EmptyAction
            icon="shield"
            title="No pathways yet"
            description="A pathway lists the vaccines, titre checks, and controls for one kind of exposure. Load the examples or add your own."
          />
        ) : (
          <>
            <ImmSearchBar
              value={pathwayList.query}
              onChange={pathwayList.setQuery}
              placeholder="Search pathways or vaccines"
              matched={pathwayList.controls.matched}
              total={pathwayList.total}
              onClear={() => pathwayList.setQuery("")}
            />
            {pathwayList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching pathways" description="Try another name, code, or vaccine." />
            ) : (
              <ImmRecordTable
                list={pathwayList.controls}
                columns={[
                  { label: "Pathway", sortKey: "name" },
                  "Vaccines",
                  "Titre check",
                  "Controls",
                  { label: "Tasks", sortKey: "tasks", align: "right" },
                  { label: "Top score", sortKey: "top", align: "right" },
                  "Actions",
                ]}
              >
                {pathwayList.pageRows.map((pathway) => {
                  const pathwayTasks = tasksByPathway.get(pathway.code) ?? [];
                  const top = Math.max(0, ...pathwayTasks.map((t) => t.score));
                  return (
                    <ListPageDataTableRow
                      key={pathway.uuid}
                      className="cursor-pointer"
                      onClick={() => setSheet({ kind: "pathway-detail", uuid: pathway.uuid })}
                    >
                      <ListPageDataTableCell className="pl-4 md:pl-6">
                        <ImmPrimaryCell
                          title={pathway.name}
                          detail={
                            <>
                              <span className="font-mono">{pathway.code}</span>
                              {pathway.is_example ? " · Example" : ""}
                            </>
                          }
                        />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmCodeChips codes={pathwayVaccines(pathway)} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        {pathway.requirements.some((item) => item.titre_required) ? (
                          <ImmStatusBadge status="pending" label="Required" />
                        ) : (
                          <span className="text-dash-muted">—</span>
                        )}
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="max-w-[14rem] truncate">
                        {pathwayControls(pathway).map(humanize).join(", ") || "—"}
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="text-right tabular-nums">{pathwayTasks.length}</ListPageDataTableCell>
                      <ListPageDataTableCell className="text-right">
                        {pathwayTasks.length > 0 ? <ImmScoreChip score={top} /> : <span className="text-dash-muted">—</span>}
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                        <ImmRowAction onClick={() => setSheet({ kind: "task", pathwayUuid: pathway.uuid })}>Add task</ImmRowAction>
                      </ListPageDataTableCell>
                    </ListPageDataTableRow>
                  );
                })}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "tasks" ? (
        tasks.length === 0 ? (
          <EmptyAction
            icon="clipboard"
            title="No tasks yet"
            description="Score a task by likelihood and severity from 1 to 5, then assign it to a department, site, or one employee."
          />
        ) : (
          <>
            <RiskMatrix
              tasks={tasks}
              cell={cell}
              onCellChange={(next) => {
                setCell(next);
                setBand("");
              }}
              onOpenTask={(task) => setSheet({ kind: "task-detail", uuid: task.uuid })}
            />
            <ImmSearchBar
              value={taskList.query}
              onChange={taskList.setQuery}
              placeholder="Search tasks"
              matched={taskList.controls.matched}
              total={tasks.length}
              onClear={hasTaskFilters ? clearTaskFilters : undefined}
              filters={
                <>
                  <ImmFilterSelect label="Pathway" value={pathwayFilter} onChange={setPathwayFilter}>
                    <option value="">All pathways</option>
                    {pathways.map((p) => (
                      <option key={p.uuid} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </ImmFilterSelect>
                  <ImmFilterSelect label="Risk band" value={band} onChange={(value) => { setBand(value); setCell(null); }}>
                    <option value="">Any risk</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </ImmFilterSelect>
                  {cell ? (
                    <button
                      type="button"
                      onClick={() => setCell(null)}
                      className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-navy px-2.5 text-[12px] font-medium text-white"
                    >
                      Likelihood {cell.likelihood} × Severity {cell.severity}
                      <X className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </>
              }
            />
            {selected.length > 0 ? (
              <ImmNotice>
                <span className="font-medium text-brand-navy">{selected.length} selected</span>
                <span className="mx-2 text-dash-muted">·</span>
                <button type="button" className="font-medium text-brand-primary hover:underline" onClick={() => setSheet({ kind: "assign", taskUuids: selected })}>
                  Assign to department or site
                </button>
                <span className="mx-2 text-dash-muted">·</span>
                <button type="button" className="text-brand-slate hover:underline" onClick={() => setSelected([])}>
                  Clear selection
                </button>
              </ImmNotice>
            ) : null}
            {taskList.pageRows.length === 0 ? (
              <EmptyAction icon="search" title="No matching tasks" description="Change the filters or pick another cell on the matrix." />
            ) : (
              <ImmRecordTable
                list={taskList.controls}
                columns={[
                  {
                    label: "",
                    className: "w-10",
                    header: (
                      <ImmSelectBox
                        label="Select tasks on this page"
                        checked={pageAllSelected}
                        indeterminate={!pageAllSelected && pageSomeSelected}
                        onChange={() =>
                          setSelected((prev) =>
                            pageAllSelected
                              ? prev.filter((id) => !pageTaskIds.includes(id))
                              : Array.from(new Set([...prev, ...pageTaskIds])),
                          )
                        }
                      />
                    ),
                  },
                  { label: "Task", sortKey: "name" },
                  { label: "Pathway", sortKey: "pathway" },
                  { label: "Likelihood", sortKey: "likelihood", align: "right" },
                  { label: "Severity", sortKey: "severity", align: "right" },
                  { label: "Score", sortKey: "score", align: "right" },
                  "Risk",
                  "Actions",
                ]}
              >
                {taskList.pageRows.map((task) => {
                  const checked = selected.includes(task.uuid);
                  return (
                    <ListPageDataTableRow
                      key={task.uuid}
                      className={checked ? "cursor-pointer bg-brand-tint/40" : "cursor-pointer"}
                      onClick={() => setSheet({ kind: "task-detail", uuid: task.uuid })}
                    >
                      <ListPageDataTableCell className="w-10 pl-4 md:pl-6">
                        <ImmSelectBox
                          label={`Select ${task.name}`}
                          checked={checked}
                          onChange={() =>
                            setSelected((prev) => (checked ? prev.filter((id) => id !== task.uuid) : [...prev, task.uuid]))
                          }
                        />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmPrimaryCell
                          title={task.name}
                          detail={
                            <>
                              <span className="font-mono">{task.code}</span>
                              {task.is_example ? " · Example" : ""}
                            </>
                          }
                        />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>{task.pathway_name ?? task.pathway_code ?? "—"}</ListPageDataTableCell>
                      <ListPageDataTableCell className="text-right tabular-nums">{task.likelihood}</ListPageDataTableCell>
                      <ListPageDataTableCell className="text-right tabular-nums">{task.severity}</ListPageDataTableCell>
                      <ListPageDataTableCell className="text-right">
                        <ImmScoreChip score={task.score} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell>
                        <ImmStatusBadge status={riskBand(task.score)} />
                      </ListPageDataTableCell>
                      <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                        <ImmRowAction onClick={() => setSheet({ kind: "assign", taskUuids: [task.uuid] })}>Assign</ImmRowAction>
                      </ListPageDataTableCell>
                    </ListPageDataTableRow>
                  );
                })}
              </ImmRecordTable>
            )}
          </>
        )
      ) : null}

      {view === "protocols" ? (
        protocols.length === 0 ? (
          <EmptyAction
            icon="activity"
            title="No protocols yet"
            description="A protocol says what happens after a failed titre: another series first, then a true non-responder."
          />
        ) : (
          <ImmRecordTable
            list={protocolList.controls}
            columns={[{ label: "Vaccine", sortKey: "vaccine" }, "Titre threshold", { label: "Max series", sortKey: "series", align: "right" }, "Pathway to non-responder", "Then"]}
          >
            {protocolList.pageRows.map((protocol: OhImmNrProtocol) => (
              <ListPageDataTableRow key={protocol.uuid}>
                <ListPageDataTableCell className="pl-4 md:pl-6">
                  <ImmCodeChips codes={[protocol.vaccine_code]} />
                </ListPageDataTableCell>
                <ListPageDataTableCell className="tabular-nums">
                  {protocol.titre_threshold != null ? `≥ ${protocol.titre_threshold} ${protocol.titre_unit}` : "—"}
                </ListPageDataTableCell>
                <ListPageDataTableCell className="text-right tabular-nums">{protocol.max_series}</ListPageDataTableCell>
                <ListPageDataTableCell>
                  <span className="flex flex-wrap items-center gap-1 text-[12px]">
                    {Array.from({ length: protocol.max_series }, (_, index) => (
                      <span key={index} className="inline-flex items-center gap-1">
                        <span className="rounded-full border border-dash-border px-2 py-0.5 text-brand-slate">Series {index + 1}</span>
                        <span className="text-dash-muted">→</span>
                        <span className="rounded-full border border-dash-border px-2 py-0.5 text-brand-slate">
                          Titre +{protocol.titre_interval_days}d
                        </span>
                        <span className="text-dash-muted">→</span>
                      </span>
                    ))}
                    <ImmStatusBadge status="non_responder" />
                  </span>
                </ListPageDataTableCell>
                <ListPageDataTableCell className="text-[12px]">
                  {[
                    protocol.recommend_role_change ? "Role review" : null,
                    protocol.recommend_ppe_plan ? "PPE plan" : null,
                    protocol.enable_hbig_fast_track ? "HBIG fast-track" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </ListPageDataTableCell>
              </ListPageDataTableRow>
            ))}
          </ImmRecordTable>
        )
      ) : null}

      {sheet?.kind === "pathway" ? <PathwaySheet onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet?.kind === "task" ? (
        <TaskSheet pathways={pathways} pathwayUuid={sheet.pathwayUuid} onClose={() => setSheet(null)} onDone={done} />
      ) : null}
      {sheet?.kind === "assign" ? (
        <AssignSheet
          tasks={tasks}
          taskUuids={sheet.taskUuids}
          onClose={() => setSheet(null)}
          onDone={(message) => {
            setSelected([]);
            done(message);
          }}
        />
      ) : null}
      {sheet?.kind === "protocol" ? <ProtocolSheet onClose={() => setSheet(null)} onDone={done} /> : null}
      {detailPathway ? (
        <PathwayDetailSheet
          pathway={detailPathway}
          tasks={tasksByPathway.get(detailPathway.code) ?? []}
          onClose={() => setSheet(null)}
          onAddTask={() => setSheet({ kind: "task", pathwayUuid: detailPathway.uuid })}
          onOpenTask={(task) => setSheet({ kind: "task-detail", uuid: task.uuid })}
        />
      ) : null}
      {detailTask ? (
        <TaskDetailSheet
          task={detailTask}
          onClose={() => setSheet(null)}
          onAssign={() => setSheet({ kind: "assign", taskUuids: [detailTask.uuid] })}
        />
      ) : null}
    </>
  );
}
