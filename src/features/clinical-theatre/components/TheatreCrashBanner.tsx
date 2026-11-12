"use client";

import Link from "next/link";
import { Siren } from "lucide-react";

import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  crashPaperworkOutstanding,
  formatMinutes,
  ncepodShortLabel,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";

type TheatreCrashBannerProps = {
  theatreCase: TheatreCase;
  /** Href for a workspace section ("pre-op" | "intra-op") and optional sub-section. */
  sectionHref: (section: "pre-op" | "intra-op", sub?: "checklist" | "op-note" | null) => string;
};

/** Amber banner listing what a crash case still owes (retrospective paperwork). */
export function TheatreCrashBanner({ theatreCase, sectionHref }: TheatreCrashBannerProps) {
  if (!theatreCase.is_crash) return null;
  const outstanding = crashPaperworkOutstanding(theatreCase);
  const minutes = theatreCase.paperwork?.decision_to_incision_minutes ?? null;
  return (
    <div
      role="status"
      data-testid="theatre-crash-banner"
      className={
        outstanding
          ? "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      }
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Siren className="size-4" aria-hidden />
          Emergency crash case
        </span>
        {theatreCase.ncepod_category ? (
          <span>{ncepodShortLabel(theatreCase.ncepod_category)}</span>
        ) : null}
        <span>Decision to incision: {formatMinutes(minutes)}</span>
        {!outstanding ? <span>· All paperwork completed</span> : null}
      </div>
      {outstanding ? (
        <div className="mt-1.5">
          <p className="text-xs">Outstanding paperwork (complete retrospectively):</p>
          <ul className="mt-1 flex flex-wrap gap-1.5" data-testid="theatre-crash-outstanding">
            {theatreCase.paperwork.outstanding.map((item) => (
              <li key={item.key}>
                <Link
                  className="inline-flex rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium hover:bg-amber-100"
                  href={sectionHref(
                    item.section === "intra-op" ? "intra-op" : "pre-op",
                    item.key === "operation_note"
                      ? "op-note"
                      : item.section === "intra-op"
                        ? "checklist"
                        : null,
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
