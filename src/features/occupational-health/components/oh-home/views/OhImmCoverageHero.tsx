"use client";

import Link from "next/link";
import { ShieldPlus } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import { cn } from "@/lib/utils";

type Summary = { people: number; compliant: number; percent_compliant: number; overdue_rows: number };
type Todo = { value: number; label: string; href: string; tone: "red" | "sky" | "amber" };

const TONE: Record<Todo["tone"], string> = {
  red: "text-red-700",
  sky: "text-sky-700",
  amber: "text-amber-700",
};

/** One square per percent of the workforce: covered squares in sky, the rest left pale. */
function Waffle({ percent }: { percent: number }) {
  const filled = Math.round(Math.max(0, Math.min(100, percent)));
  return (
    <div role="img" aria-label={`${filled}% of workers are fully covered`} className="grid w-fit shrink-0 grid-cols-10 gap-[3px]">
      {Array.from({ length: 100 }, (_, index) => (
        <span key={index} className={cn("size-2.5 rounded-[2px]", index < filled ? "bg-sky-600" : "bg-sky-100")} />
      ))}
    </div>
  );
}

/** Immunization coverage at a glance, with the three things to act on beside it. */
export function OhImmCoverageHero({
  summary,
  todos,
  isLoading,
  isError,
  onRetry,
}: {
  summary?: Summary;
  todos: Todo[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  return (
    <ViewSection title="Coverage" icon={ShieldPlus} href={ROUTES.immunizationsCompliance} linkLabel="Full report" testId="oh-home-imm-coverage">
      <QueryState isLoading={isLoading} isError={isError} onRetry={onRetry} rows={3}>
        <div className="flex flex-col gap-8 border-t border-dash-border/70 pt-5 @2xl:flex-row @2xl:items-center">
          {summary && summary.people > 0 ? (
            <div className="flex items-center gap-6">
              <Waffle percent={summary.percent_compliant} />
              <div>
                <p className="text-[40px] leading-none font-semibold tracking-tight text-brand-navy tabular-nums">
                  {Math.round(summary.percent_compliant)}
                  <span className="text-[22px] text-dash-muted">%</span>
                </p>
                <p className="mt-2 max-w-[13rem] text-[13px] text-dash-muted">
                  <span className="font-semibold text-brand-navy tabular-nums">{summary.compliant}</span> of {summary.people} workers have every vaccine their job needs.
                </p>
              </div>
            </div>
          ) : (
            <p className="max-w-sm text-[13.5px] text-dash-muted">No workers have a vaccine schedule yet. Coverage appears once schedules are assigned.</p>
          )}
          <ul className="grid flex-1 gap-y-3 @2xl:border-l @2xl:border-dash-border @2xl:pl-8">
            {todos.map((todo) => (
              <li key={todo.label}>
                <Link href={todo.href} data-testid="oh-home-todo" className="group flex items-baseline gap-3 focus-visible:outline-none">
                  <span className={cn("w-12 shrink-0 text-right text-[24px] leading-7 font-semibold tabular-nums", todo.value > 0 ? TONE[todo.tone] : "text-dash-muted/60")}>
                    {todo.value}
                  </span>
                  <span className="text-[13.5px] text-brand-slate group-hover:text-brand-primary group-focus-visible:underline">{todo.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </QueryState>
    </ViewSection>
  );
}
