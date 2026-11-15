import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type OhAttentionItem = {
  key: string;
  value: number | null;
  label: string;
  hint?: ReactNode;
  href?: string;
  tone?: "danger" | "warning" | "default";
};

/** A few plain statements, each one a way into the work behind it. */
export function OhComplianceAttention({ items, isLoading }: { items: OhAttentionItem[]; isLoading: boolean }) {
  return (
    <ul className="border-t border-dash-border/70">
      {items.map((item) => {
        const body = (
          <>
            <span
              className={cn(
                "w-14 shrink-0 text-right text-[24px] leading-7 font-semibold tracking-tight tabular-nums",
                item.value === null || isLoading ? "text-dash-muted/60" : item.value > 0 && item.tone === "danger" ? "text-red-700" : item.value > 0 && item.tone === "warning" ? "text-amber-700" : "text-brand-navy",
              )}
            >
              {isLoading ? "…" : (item.value ?? "—")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-brand-navy group-hover:text-brand-primary">{item.label}</span>
              {item.hint ? <span className="block text-[12.5px] text-dash-muted">{item.hint}</span> : null}
            </span>
            {item.href ? <ArrowRight aria-hidden className="size-4 shrink-0 text-dash-border transition-colors group-hover:text-brand-primary" /> : null}
          </>
        );
        return (
          <li key={item.key} data-testid={`oh-compliance-metric-${item.key}`} className="border-b border-dash-border/70">
            {item.href ? (
              <Link href={item.href} className="group flex items-center gap-4 py-3 focus-visible:outline-none focus-visible:[&_span]:underline">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-4 py-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
