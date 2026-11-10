"use client";

import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { ImmStatusBadge } from "../shared/ImmRecordTable";
import { PDCA_STAGES } from "./RcaSheet";

export type PdcaStage = (typeof PDCA_STAGES)[number];
type Row = Record<string, unknown>;

const STAGE_COPY: Record<PdcaStage, { title: string; hint: string }> = {
  plan: { title: "Plan", hint: "Find the root cause" },
  do: { title: "Do", hint: "Carry out corrective actions" },
  check: { title: "Check", hint: "Confirm the actions worked" },
  act: { title: "Act", hint: "Standardise and close" },
};

const BOARD_CARD_LIMIT = 6;

function notStarted(rows: Row[]): number {
  return rows.filter((row) => row.status === "stub").length;
}

/** Plan → Do → Check → Act band. Each stage filters the RCA list. */
export function PdcaPipeline({
  byStage,
  active,
  onSelect,
}: {
  byStage: Record<PdcaStage, Row[]>;
  active: PdcaStage | "all";
  onSelect: (stage: PdcaStage | "all") => void;
}) {
  return (
    <div
      data-list-band
      data-testid="oh-imm-pdca-pipeline"
      role="group"
      aria-label="PDCA stage"
      className="grid grid-cols-2 gap-2 border-b border-dash-border/80 bg-white px-4 py-3 md:grid-cols-4 md:px-6"
    >
      {PDCA_STAGES.map((stage, index) => {
        const rows = byStage[stage];
        const waiting = notStarted(rows);
        const selected = active === stage;
        return (
          <div key={stage} className="relative flex items-center">
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? "all" : stage)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-brand-primary bg-brand-tint"
                  : "border-dash-border bg-white hover:border-brand-primary/40 hover:bg-dash-canvas",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-dash-muted">
                  {index + 1}. {STAGE_COPY[stage].title}
                </span>
                <span className="text-lg font-semibold tabular-nums text-brand-navy">{rows.length}</span>
              </span>
              <span className="text-[12px] text-brand-slate">{STAGE_COPY[stage].hint}</span>
              <span className={cn("text-[11px]", waiting > 0 ? "text-amber-700" : "text-dash-muted")}>
                {waiting > 0 ? `${waiting} not started` : rows.length > 0 ? "All in progress" : "Nothing here"}
              </span>
            </button>
            {index < PDCA_STAGES.length - 1 ? (
              <ChevronRight
                aria-hidden
                className="absolute -right-2 z-10 hidden size-4 rounded-full bg-white text-dash-muted md:block"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Kanban view of RCAs by stage. Long columns hand over to the filtered table. */
export function PdcaKanban({
  byStage,
  onOpen,
  onShowAll,
}: {
  byStage: Record<PdcaStage, Row[]>;
  onOpen: (uuid: string) => void;
  onShowAll: (stage: PdcaStage) => void;
}) {
  return (
    <div data-list-band className="grid gap-3 bg-dash-canvas/60 px-4 py-4 md:grid-cols-4 md:px-6">
      {PDCA_STAGES.map((stage) => {
        const rows = byStage[stage];
        const hidden = rows.length - BOARD_CARD_LIMIT;
        return (
          <section key={stage} aria-label={STAGE_COPY[stage].title} className="flex min-w-0 flex-col gap-2">
            <h3 className="flex items-center justify-between px-1 text-[12px] font-semibold uppercase tracking-wide text-dash-muted">
              {STAGE_COPY[stage].title}
              <span className="tabular-nums">{rows.length}</span>
            </h3>
            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-dash-border px-3 py-6 text-center text-[12px] text-dash-muted">
                Nothing in {STAGE_COPY[stage].title.toLowerCase()}
              </p>
            ) : (
              rows.slice(0, BOARD_CARD_LIMIT).map((row) => {
                const actions = Array.isArray(row.actions) ? row.actions.length : 0;
                const whys = Array.isArray(row.five_whys) ? row.five_whys.length : 0;
                return (
                  <button
                    key={String(row.uuid)}
                    type="button"
                    onClick={() => onOpen(String(row.uuid))}
                    className="flex flex-col gap-1.5 rounded-lg border border-dash-border bg-white p-3 text-left shadow-xs transition-colors hover:border-brand-primary/50"
                  >
                    <span className="line-clamp-2 text-[13px] font-medium text-brand-navy">
                      {String(row.summary || "Exposure RCA")}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-dash-muted">
                      <ImmStatusBadge status={String(row.status ?? "")} />
                      <span>{whys}/5 whys</span>
                      <span aria-hidden>·</span>
                      <span>
                        {actions} action{actions === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
            {hidden > 0 ? (
              <button
                type="button"
                onClick={() => onShowAll(stage)}
                className="rounded-md px-2 py-1 text-left text-[12px] font-medium text-brand-primary hover:underline"
              >
                +{hidden} more in {STAGE_COPY[stage].title}
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
