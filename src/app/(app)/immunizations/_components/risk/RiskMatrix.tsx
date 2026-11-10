"use client";

import { cn } from "@/lib/utils";
import type { OhImmTask } from "@/features/occupational-health/services/immunisation.service";
import { ImmScoreChip } from "../shared/ImmVisuals";

export type RiskCell = { likelihood: number; severity: number };

const LEVELS = [1, 2, 3, 4, 5] as const;

export function riskBand(score: number): "urgent" | "high" | "low" {
  if (score >= 15) return "urgent";
  if (score >= 8) return "high";
  return "low";
}

const CELL_TONE: Record<ReturnType<typeof riskBand>, { filled: string; empty: string }> = {
  urgent: { filled: "bg-red-500 text-white hover:bg-red-600", empty: "bg-red-50 text-red-300" },
  high: { filled: "bg-amber-400 text-amber-950 hover:bg-amber-500", empty: "bg-amber-50 text-amber-300" },
  low: { filled: "bg-emerald-400 text-emerald-950 hover:bg-emerald-500", empty: "bg-emerald-50 text-emerald-300" },
};

/**
 * 5×5 likelihood × severity heat map. Each cell shows how many tasks score there;
 * clicking a cell filters the task list to it.
 */
export function RiskMatrix({
  tasks,
  cell,
  onCellChange,
  onOpenTask,
}: {
  tasks: OhImmTask[];
  cell: RiskCell | null;
  onCellChange: (cell: RiskCell | null) => void;
  onOpenTask: (task: OhImmTask) => void;
}) {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const key = `${task.likelihood}:${task.severity}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topTasks = tasks.toSorted((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div
      data-list-band
      data-testid="oh-imm-risk-matrix"
      className="grid gap-6 border-b border-dash-border/80 bg-white px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)] md:px-6"
    >
      <div className="flex gap-2">
        <div className="flex items-center">
          <span className="-rotate-180 text-[11px] font-medium uppercase tracking-wide text-dash-muted [writing-mode:vertical-rl]">
            Severity
          </span>
        </div>
        <div>
          <div className="grid grid-cols-[auto_repeat(5,2.25rem)] gap-1" role="group" aria-label="Risk matrix">
            {LEVELS.toReversed().map((severity) => (
              <div key={severity} className="contents">
                <span className="flex w-4 items-center justify-end text-[11px] tabular-nums text-dash-muted">{severity}</span>
                {LEVELS.map((likelihood) => {
                  const count = counts.get(`${likelihood}:${severity}`) ?? 0;
                  const band = riskBand(likelihood * severity);
                  const selected = cell?.likelihood === likelihood && cell.severity === severity;
                  return (
                    <button
                      key={likelihood}
                      type="button"
                      disabled={count === 0}
                      aria-pressed={selected}
                      aria-label={`Likelihood ${likelihood}, severity ${severity}: ${count} task${count === 1 ? "" : "s"}`}
                      onClick={() => onCellChange(selected ? null : { likelihood, severity })}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md text-[12px] font-semibold tabular-nums transition",
                        count > 0 ? CELL_TONE[band].filled : CELL_TONE[band].empty,
                        count === 0 && "cursor-default",
                        selected && "ring-2 ring-brand-navy ring-offset-2",
                        cell && !selected && count > 0 && "opacity-40",
                      )}
                    >
                      {count > 0 ? count : ""}
                    </button>
                  );
                })}
              </div>
            ))}
            <span />
            {LEVELS.map((likelihood) => (
              <span key={likelihood} className="text-center text-[11px] tabular-nums text-dash-muted">
                {likelihood}
              </span>
            ))}
          </div>
          <p className="mt-1 pl-5 text-center text-[11px] font-medium uppercase tracking-wide text-dash-muted">Likelihood</p>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-brand-navy">Highest-risk tasks</p>
          <div className="flex items-center gap-3 text-[11px] text-dash-muted">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-sm bg-red-500" /> Urgent 15+
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-sm bg-amber-400" /> High 8–14
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-sm bg-emerald-400" /> Low
            </span>
          </div>
        </div>
        <ul className="divide-y divide-dash-border/70">
          {topTasks.map((task) => (
            <li key={task.uuid}>
              <button
                type="button"
                onClick={() => onOpenTask(task)}
                className="flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-brand-tint/50"
              >
                <ImmScoreChip score={task.score} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-brand-navy">{task.name}</span>
                  <span className="block truncate text-[12px] text-dash-muted">
                    {task.pathway_name ?? task.pathway_code ?? "No pathway"} · L{task.likelihood} × S{task.severity}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
