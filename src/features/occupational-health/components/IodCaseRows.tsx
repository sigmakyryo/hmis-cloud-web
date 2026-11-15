"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { dayOfCase, isClosed, missingRecords } from "@/features/occupational-health/lib/iod-case-list";
import type { IodCase } from "@/features/occupational-health/types";
import { formatOhDate, humanizeOhCode } from "@/features/occupational-health/utils/oh-format";
import { ROUTES } from "@/constants/routes";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const SEVERITY_BAR: Record<string, string> = {
  minor: "bg-brand-primary",
  moderate: "bg-amber-500",
  major: "bg-red-600",
  fatal: "bg-red-800",
};
const SEVERITY_CHIP: Record<string, string> = {
  minor: "bg-brand-tint text-brand-primary",
  moderate: "bg-amber-50 text-amber-800",
  major: "bg-red-50 text-red-700",
  fatal: "bg-red-700 text-white",
};

type RowActions = {
  onSetStatus: (row: IodCase, status: "open" | "under_review") => void;
  onCopyLink: (row: IodCase) => void;
  isSaving: boolean;
};

function CaseRow({ row, actions }: { row: IodCase; actions: RowActions }) {
  const closed = isClosed(row);
  const severity = (row.severity || "minor").toLowerCase();
  const title = [row.body_part, row.mechanism].filter(Boolean).join(" · ") || "Injury";
  const where = [row.worker_name, row.employer_name, row.incident_location].filter(Boolean).join(" · ");
  const missing = missingRecords(row);
  const day = dayOfCase(row.onset_date);
  const underReview = (row.status || "").toLowerCase() === "under_review";
  const href = ROUTES.occupationalHealthRecord("iod", row.uuid);

  return (
    <li className="group relative border-b border-dash-border/70 last:border-b-0" data-testid="oh-iod-row">
      <Link
        href={href}
        className="grid grid-cols-[3px_minmax(0,1fr)_auto] items-start gap-x-4 py-3.5 pr-11 pl-0 focus-visible:outline-none"
      >
        <span aria-hidden className={cn("mt-0.5 h-full min-h-9 self-stretch rounded-full", closed ? "bg-dash-border" : (SEVERITY_BAR[severity] ?? "bg-dash-border"))} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={cn("text-[14.5px] font-semibold group-hover:text-brand-primary group-focus-within:underline", closed ? "text-brand-slate" : "text-brand-navy")}>{title}</span>
            <span className={cn("rounded-md px-1.5 py-px text-[11.5px] font-semibold", closed ? "bg-dash-canvas text-dash-muted" : (SEVERITY_CHIP[severity] ?? "bg-dash-canvas text-brand-slate"))}>
              {humanizeOhCode(severity)}
            </span>
            {underReview ? <span className="rounded-md bg-amber-50 px-1.5 py-px text-[11.5px] font-semibold text-amber-800">Under review</span> : null}
          </span>
          {where ? <span className="mt-0.5 block truncate text-[13px] text-dash-muted">{where}</span> : null}
          {missing.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-x-4 text-[12.5px] font-medium text-amber-700" data-testid="oh-iod-missing">
              {missing.map((text) => (
                <span key={text}>{text}</span>
              ))}
            </span>
          ) : null}
        </span>
        <span className="text-right">
          {closed ? (
            <>
              <span className="block text-[13px] font-medium text-dash-muted">Closed {formatOhDate(row.closed_on ?? row.onset_date)}</span>
              {row.lost_days > 0 ? <span className="block text-[12.5px] text-dash-muted tabular-nums">{row.lost_days} days lost</span> : null}
            </>
          ) : (
            <>
              <span className="block text-[13.5px] font-semibold text-brand-navy tabular-nums">{day ? `Day ${day}` : "—"}</span>
              <span className="block text-[12.5px] text-dash-muted tabular-nums">
                {row.lost_days > 0 ? `${row.lost_days} days lost` : formatOhDate(row.onset_date)}
              </span>
            </>
          )}
        </span>
      </Link>
      <div className="absolute top-3 right-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${title}`}
            className="flex size-8 items-center justify-center rounded-full text-dash-muted transition-colors hover:bg-dash-canvas hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={appFont.className}>
            <DropdownMenuItem asChild>
              <Link href={href}>Open case</Link>
            </DropdownMenuItem>
            {closed ? (
              <DropdownMenuItem disabled={actions.isSaving} onSelect={() => actions.onSetStatus(row, "open")}>
                Reopen case
              </DropdownMenuItem>
            ) : (
              <>
                {!underReview ? (
                  <DropdownMenuItem disabled={actions.isSaving} onSelect={() => actions.onSetStatus(row, "under_review")}>
                    Mark as under review
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled={actions.isSaving} onSelect={() => actions.onSetStatus(row, "open")}>
                    Back to open
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`${href}?tab=follow-up`}>Follow-ups</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => actions.onCopyLink(row)}>Copy link to this case</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** A heading with its count, then the cases under it. */
export function IodCaseGroup({
  title,
  rows,
  actions,
  footer,
}: {
  title: string;
  rows: IodCase[];
  actions: RowActions;
  footer?: React.ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <section aria-label={title} data-testid={`oh-iod-group-${title.toLowerCase()}`}>
      <h2 className="mb-1 flex items-baseline gap-2 text-[13px] font-semibold text-brand-navy">
        {title}
        <span className="font-normal text-dash-muted tabular-nums">{rows.length}</span>
      </h2>
      <ul className="border-t border-dash-border/70">
        {rows.map((row) => (
          <CaseRow key={row.uuid} row={row} actions={actions} />
        ))}
      </ul>
      {footer}
    </section>
  );
}
