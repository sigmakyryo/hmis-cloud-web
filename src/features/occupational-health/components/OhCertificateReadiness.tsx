"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, Check, ChevronRight, CircleDashed, Loader2, OctagonX, TriangleAlert } from "lucide-react";

import { OhCopilotResult, citedPoints } from "@/features/occupational-health/components/OhCopilotResult";
import { useVisitBrief } from "@/features/occupational-health/hooks/use-visit-brief";
import { isOhEncounterPanelId, type OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  askVisitCopilot,
  type CopilotPoint,
  type CopilotResponse,
} from "@/features/occupational-health/services/visit-copilot.service";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

type CheckState = "blocked" | "review" | "clear" | "checking" | "unchecked";

const CHECKS: { source: string; label: string; panel: OhEncounterPanelId }[] = [
  { source: "fitness", label: "Fitness", panel: "fitness" },
  { source: "vaccine", label: "Vaccines", panel: "immunizations" },
  { source: "hearing", label: "Hearing", panel: "health-checks" },
  { source: "lung", label: "Lung function", panel: "health-checks" },
  { source: "hazard", label: "Hazards", panel: "employment" },
  { source: "exam", label: "Examination", panel: "medical-examinations" },
];

const STATE_ORDER: Record<CheckState, number> = { blocked: 0, review: 1, checking: 2, unchecked: 3, clear: 4 };

const STATE_STYLE: Record<CheckState, { label: string; text: string; bar: string }> = {
  blocked: { label: "Blocked", text: "text-red-700", bar: "bg-red-500" },
  review: { label: "Review", text: "text-amber-700", bar: "bg-amber-400" },
  clear: { label: "Clear", text: "text-emerald-700", bar: "bg-emerald-500" },
  checking: { label: "Checking", text: "text-dash-muted", bar: "bg-dash-border animate-pulse" },
  unchecked: { label: "Not checked", text: "text-dash-muted", bar: "bg-dash-border" },
};

type ReadinessRow = (typeof CHECKS)[number] & { cited: CopilotPoint[]; state: CheckState };

export type OhCertificateReadinessProps = {
  visitUuid: string;
  /** Immunisation gate message when the certificate cannot be signed. */
  gateBlocked?: string | null;
  gateWarnings?: string[];
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  /** Present when the open form has fields the drafted write-up can fill. */
  onUseDraft?: (draft: { wording?: string; restrictions?: string[] }) => void;
  showDraft?: boolean;
  className?: string;
};

/** Certificate readiness: the visit is checked when it opens; each record area shows what is still open. */
export function OhCertificateReadiness({
  visitUuid,
  gateBlocked = null,
  gateWarnings = [],
  onOpenPanel,
  onUseDraft,
  showDraft = true,
  className,
}: OhCertificateReadinessProps) {
  const brief = useVisitBrief(visitUuid);
  const [answer, setAnswer] = useState<CopilotResponse | null>(null);
  const points = brief.data ? citedPoints(brief.data.points) : [];
  const rows: ReadinessRow[] = CHECKS.map((check) => {
    const cited = points.filter((point) => point.source === check.source);
    const gated = check.source === "vaccine";
    const state: CheckState =
      gated && gateBlocked
        ? "blocked"
        : cited.length > 0 || (gated && gateWarnings.length > 0)
          ? "review"
          : brief.isLoading
            ? "checking"
            : brief.data
              ? "clear"
              : "unchecked";
    return { ...check, cited, state };
  });
  const sortedRows = rows.toSorted((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
  const openCount = rows.filter((row) => row.state === "review" || row.state === "blocked").length;
  const blocked = rows.some((row) => row.state === "blocked");

  return (
    <aside
      aria-label="Certificate readiness"
      data-testid="oh-cof-readiness"
      className={cn("flex min-h-0 flex-col bg-white", className)}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-brand-navy">Readiness</h3>
            <ReadinessSummary loading={brief.isLoading} blocked={blocked} openCount={openCount} />
          </div>
          <div className="mt-2.5 flex gap-1" aria-hidden>
            {rows.map((row) => (
              <span key={row.source} className={cn("h-1 flex-1 rounded-full", STATE_STYLE[row.state].bar)} />
            ))}
          </div>
          {brief.data?.message ? <ExpandableText text={brief.data.message} lines={2} className="mt-2.5 text-[12.5px] text-dash-muted" /> : null}
          {brief.isError ? (
            <p className="mt-2.5 text-[12px] text-dash-muted">
              {brief.error instanceof Error ? brief.error.message : "Records could not be checked."}{" "}
              <button type="button" className="font-medium text-brand-primary hover:underline" onClick={() => void brief.refetch()}>
                Check again
              </button>
            </p>
          ) : null}
        </div>

        <ol className="border-y border-dash-border">
          {sortedRows.map((row) => (
            <ReadinessCheck
              key={row.source}
              row={row}
              gateBlocked={row.source === "vaccine" ? gateBlocked : null}
              gateWarnings={row.source === "vaccine" ? gateWarnings : []}
              onOpenPanel={onOpenPanel}
            />
          ))}
        </ol>

        {showDraft ? <DraftWriteUp result={brief.data} loading={brief.isLoading} onUseDraft={onUseDraft} /> : null}
        {answer ? (
          <div className="border-b border-dash-border px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-dash-muted">Answer</p>
            <OhCopilotResult result={answer} onOpenPanel={onOpenPanel} />
          </div>
        ) : null}
      </div>
      <AskVisit visitUuid={visitUuid} onAnswer={setAnswer} />
    </aside>
  );
}

function ReadinessCheck({
  row,
  gateBlocked,
  gateWarnings,
  onOpenPanel,
}: {
  row: ReadinessRow;
  gateBlocked: string | null;
  gateWarnings: string[];
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const style = STATE_STYLE[row.state];
  const open = row.state === "review" || row.state === "blocked";
  const openable = open && Boolean(onOpenPanel);
  const summary = (
    <>
      <StateIcon state={row.state} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-medium text-brand-navy">{row.label}</span>
          <span className={cn("text-[11.5px] font-medium", style.text)}>{style.label}</span>
        </span>
        {row.cited.map((point) => (
          <span key={`${point.fact_id}-${point.text}`} className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-dash-muted">
            {point.text}
          </span>
        ))}
      </span>
      {openable ? (
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-dash-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-primary" aria-hidden />
      ) : null}
    </>
  );

  return (
    <li
      className="border-b border-dash-border/60 last:border-b-0"
      data-testid={`oh-cof-check-${row.source}`}
      data-state={row.state}
    >
      {openable && onOpenPanel ? (
        <button
          type="button"
          aria-label={`Open ${row.label}`}
          onClick={() => onOpenPanel(panelFor(row.cited[0], row.panel))}
          className="group flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-dash-canvas/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"
        >
          {summary}
        </button>
      ) : (
        <div className="flex items-start gap-3 px-4 py-2.5">{summary}</div>
      )}
      {gateBlocked ? (
        <div role="alert" data-testid="oh-imm-fitness-blocked" className="mx-4 mb-2.5 ml-[44px] space-y-1 rounded-md bg-red-50 px-2.5 py-2 text-[12px] text-red-800">
          <p className="font-medium">Certificate blocked until immunizations are complete</p>
          <p>{gateBlocked}</p>
          <Link href={ROUTES.immunizationsDue} className="inline-flex font-medium text-brand-navy underline-offset-2 hover:underline">
            Record a dose
          </Link>
        </div>
      ) : null}
      {!gateBlocked && gateWarnings.length > 0 ? (
        <ul role="status" data-testid="oh-imm-fitness-warnings" className="mx-4 mb-2.5 ml-[44px] space-y-0.5 rounded-md bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900">
          {gateWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function panelFor(point: CopilotPoint | undefined, fallback: OhEncounterPanelId): OhEncounterPanelId {
  return point && isOhEncounterPanelId(point.panel) ? point.panel : fallback;
}

function ExpandableText({ text, lines, className }: { text: string; lines: 2 | 4; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > (lines === 2 ? 140 : 260);
  return (
    <div className={className}>
      <p className={cn("whitespace-pre-wrap leading-relaxed", !expanded && long && (lines === 2 ? "line-clamp-2" : "line-clamp-4"))}>{text}</p>
      {long ? (
        <button type="button" className="mt-0.5 text-[12px] font-medium text-brand-primary hover:underline" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function ReadinessSummary({ loading, blocked, openCount }: { loading: boolean; blocked: boolean; openCount: number }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-dash-muted">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        Checking records
      </span>
    );
  }
  const tone = blocked
    ? "bg-red-50 text-red-800 ring-red-200"
    : openCount > 0
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : "bg-emerald-50 text-emerald-800 ring-emerald-200";
  const label = blocked ? "Not ready" : openCount > 0 ? `${openCount} to review` : "Ready to sign";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset", tone)} data-testid="oh-cof-readiness-summary">
      {label}
    </span>
  );
}

function StateIcon({ state }: { state: CheckState }) {
  switch (state) {
    case "blocked":
      return <OctagonX className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />;
    case "review":
      return <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />;
    case "clear":
      return (
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" aria-hidden>
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      );
    case "checking":
      return <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-dash-muted" aria-hidden />;
    default:
      return <CircleDashed className="mt-0.5 size-4 shrink-0 text-dash-muted" aria-hidden />;
  }
}

function DraftWriteUp({
  result,
  loading,
  onUseDraft,
}: {
  result: CopilotResponse | undefined;
  loading: boolean;
  onUseDraft?: OhCertificateReadinessProps["onUseDraft"];
}) {
  const [used, setUsed] = useState(false);
  const wording = result?.draft.wording?.trim() ?? "";
  const restrictions = (result?.draft.restrictions ?? []).filter((line) => line.trim() !== "");
  if (!loading && !wording && restrictions.length === 0) return null;

  return (
    <section aria-label="Drafted write-up" className="border-b border-dash-border px-4 py-3" data-testid="oh-cof-draft">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-brand-navy">Drafted write-up</h3>
        {onUseDraft && (wording || restrictions.length > 0) ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium ring-1 ring-inset transition-colors",
              used ? "text-emerald-700 ring-emerald-200" : "text-brand-primary ring-brand-primary/25 hover:bg-brand-tint/50",
            )}
            onClick={() => {
              onUseDraft({ wording, restrictions });
              setUsed(true);
            }}
          >
            {used ? <Check className="size-3" aria-hidden /> : null}
            {used ? "Used in form" : "Use in form"}
          </button>
        ) : null}
      </div>
      {loading ? (
        <div className="mt-2.5 space-y-1.5" aria-hidden>
          <div className="h-3 w-11/12 animate-pulse rounded bg-dash-border/70" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-dash-border/70" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-dash-border/70" />
        </div>
      ) : (
        <div className="mt-2.5 border-l-2 border-brand-primary/30 pl-3 text-[12.5px] text-brand-navy">
          {wording ? <ExpandableText text={wording} lines={4} /> : null}
          {restrictions.length > 0 ? (
            <ul className={cn("list-disc space-y-0.5 pl-4", wording && "mt-2")}>
              {restrictions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      <p className="mt-2 text-[11px] text-dash-muted">Drafted from this visit&apos;s records. Review before signing.</p>
    </section>
  );
}

function AskVisit({ visitUuid, onAnswer }: { visitUuid: string; onAnswer: (answer: CopilotResponse) => void }) {
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    const question = prompt.trim();
    if (!question) return;
    setPending(true);
    setError("");
    try {
      onAnswer(await askVisitCopilot(visitUuid, question));
      setPrompt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not answer that.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="shrink-0 border-t border-dash-border bg-white px-3 py-3">
      {error ? <p className="mb-1.5 px-1 text-[12px] text-red-700">{error}</p> : null}
      <form
        className="flex items-center gap-2 rounded-lg border border-dash-border bg-white py-1 pr-1 pl-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus-within:border-brand-primary/40 focus-within:ring-2 focus-within:ring-brand-primary/20"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <label className="sr-only" htmlFor={`oh-cof-ask-${visitUuid}`}>
          Ask about this visit
        </label>
        <input
          id={`oh-cof-ask-${visitUuid}`}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask about this visit"
          className="h-8 min-w-0 flex-1 bg-transparent text-[13px] text-brand-navy outline-none placeholder:text-dash-muted"
        />
        <button
          type="submit"
          aria-label="Ask"
          disabled={pending || prompt.trim() === ""}
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-primary text-white transition-opacity disabled:opacity-30"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />}
        </button>
      </form>
    </div>
  );
}
