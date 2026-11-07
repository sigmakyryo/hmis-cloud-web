"use client";

import { CheckCircle2, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { toast as sonnerToast } from "sonner";

import type { CatalogPricelistMasmCoreSyncJob } from "@/features/catalog/types/catalog.types";
import { cn } from "@/lib/utils";

export type PricelistSyncResultStats = Pick<
  CatalogPricelistMasmCoreSyncJob,
  | "matched"
  | "updated"
  | "unchanged"
  | "imported"
  | "approval_required"
  | "names_updated"
>;

type PricelistSyncResultToastProps = {
  toastId: string | number;
  title?: string;
  stats: PricelistSyncResultStats;
};

const STAT_ITEMS: {
  key: keyof PricelistSyncResultStats;
  label: string;
  emphasize?: boolean;
}[] = [
  { key: "matched", label: "Matched" },
  { key: "updated", label: "Updated", emphasize: true },
  { key: "names_updated", label: "Names" },
  { key: "imported", label: "Imported" },
  { key: "unchanged", label: "Unchanged" },
  { key: "approval_required", label: "Pending approval" },
];

function formatStatValue(stats: PricelistSyncResultStats, key: keyof PricelistSyncResultStats) {
  const value = stats[key];
  return typeof value === "number" ? value : 0;
}

export function PricelistSyncResultToast({
  toastId,
  title = "Sync completed",
  stats,
}: PricelistSyncResultToastProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl",
        "border border-slate-200 bg-white",
        "shadow-[0_8px_30px_rgba(15,23,42,0.12)]",
      )}
      data-testid="pricelist-sync-result-toast"
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Prices and tariffs synced successfully.
          </p>

          <button
            type="button"
            className={cn(
              "mt-2 -ml-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
              "text-xs font-medium text-slate-600 transition-colors",
              "hover:bg-slate-100 hover:text-slate-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
            )}
            aria-expanded={expanded}
            data-testid="pricelist-sync-result-toast-toggle"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Hide details" : "View details"}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        <button
          type="button"
          className={cn(
            "mt-0.5 rounded-md p-1 text-slate-400 transition-colors",
            "hover:bg-slate-100 hover:text-slate-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
          )}
          aria-label="Dismiss"
          onClick={() => sonnerToast.dismiss(toastId)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div
            className="border-t border-slate-100 bg-slate-50 px-3.5 py-3"
            data-testid="pricelist-sync-result-toast-details"
          >
            <dl className="grid grid-cols-3 gap-2">
              {STAT_ITEMS.map((item) => {
                const value = formatStatValue(stats, item.key);
                return (
                  <div
                    key={item.key}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                  >
                    <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {item.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-0.5 text-sm font-semibold tabular-nums text-slate-800",
                        item.emphasize && value > 0 && "text-emerald-700",
                      )}
                    >
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function showPricelistSyncResultToast(
  stats: PricelistSyncResultStats,
  options?: {
    /** Loading toast id to dismiss before showing the result (avoids stuck spinner). */
    replaceId?: string | number;
    title?: string;
  },
): string | number {
  if (options?.replaceId != null) {
    sonnerToast.dismiss(options.replaceId);
  }

  return sonnerToast.custom(
    (toastId) => (
      <PricelistSyncResultToast
        toastId={toastId}
        title={options?.title}
        stats={stats}
      />
    ),
    {
      // Fresh toast id — do not merge onto a loading toast (Sonner keeps type=loading).
      duration: Infinity,
      icon: null,
      className:
        "!bg-transparent !border-0 !shadow-none !p-0 !w-auto !max-w-none",
    },
  );
}
