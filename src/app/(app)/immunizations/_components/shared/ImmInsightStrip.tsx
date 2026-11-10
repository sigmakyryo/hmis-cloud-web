"use client";

import {
  LIST_PAGE_INSIGHT_CELL_CLASS,
  LIST_PAGE_INSIGHT_LABEL_CLASS,
  LIST_PAGE_INSIGHT_STRIP_CLASS,
  LIST_PAGE_INSIGHT_VALUE_CLASS,
} from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";

export type ImmInsightTone = "default" | "danger" | "warning" | "success";

export type ImmInsight = {
  label: string;
  value: number | string;
  hint?: string;
  tone?: ImmInsightTone;
  /** Makes the figure a quick filter for the list below. */
  onSelect?: () => void;
  active?: boolean;
};

const DOT: Record<ImmInsightTone, string> = {
  default: "",
  danger: "bg-red-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
};

/** Directory-style figures under the tabs. Figures with `onSelect` filter the list. */
export function ImmInsightStrip({ items, testId }: { items: ImmInsight[]; testId?: string }) {
  return (
    <div data-list-band data-testid={testId} className={LIST_PAGE_INSIGHT_STRIP_CLASS}>
      {items.map((item) => {
        const tone = item.tone ?? "default";
        const body = (
          <>
            <span className={LIST_PAGE_INSIGHT_LABEL_CLASS}>{item.label}</span>
            <span className={cn(LIST_PAGE_INSIGHT_VALUE_CLASS, "inline-flex items-center gap-1.5")}>
              {tone !== "default" ? <span className={cn("size-1.5 rounded-full", DOT[tone])} aria-hidden /> : null}
              {item.value}
            </span>
            {item.hint ? <span className="order-3 text-[12px] text-dash-muted">{item.hint}</span> : null}
          </>
        );
        return item.onSelect ? (
          <button
            key={item.label}
            type="button"
            aria-pressed={item.active ?? false}
            onClick={item.onSelect}
            className={cn(
              LIST_PAGE_INSIGHT_CELL_CLASS,
              "-mx-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-dash-canvas",
              item.active && "bg-brand-tint/70 ring-1 ring-brand-primary/20",
            )}
          >
            {body}
          </button>
        ) : (
          <div key={item.label} className={cn(LIST_PAGE_INSIGHT_CELL_CLASS, "py-1")}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
