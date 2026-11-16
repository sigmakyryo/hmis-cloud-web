"use client";

import { CalendarRange, Download, Eye, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import type { AnnualAudience } from "@/features/occupational-health/services/oh-annual-report.service";
import { cn } from "@/lib/utils";

/** What the report covers on the left, what you can do with it on the right. */
export function OhAnnualToolbar({
  periodText,
  onChangePeriod,
  employers,
  employer,
  onEmployerChange,
  audience,
  onAudienceChange,
  isRefreshing,
  onRefresh,
  canPreview,
  onPreview,
  csvHref,
  pdfHref,
}: {
  periodText: string;
  onChangePeriod: () => void;
  employers: Array<{ uuid: string; name: string }>;
  employer: string;
  onEmployerChange: (uuid: string) => void;
  audience: AnnualAudience;
  onAudienceChange: (audience: AnnualAudience) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  canPreview: boolean;
  onPreview: () => void;
  csvHref: string;
  pdfHref: string;
}) {
  return (
    <div data-list-band className="sticky top-0 z-10 border-b border-dash-border bg-white/90 px-5 py-3 backdrop-blur md:px-8 xl:px-10 print:hidden">
      <h1 className="sr-only">Annual report</h1>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5" role="toolbar" aria-label="Report options">
          <button
            type="button"
            onClick={onChangePeriod}
            aria-label={`Period: ${periodText}. Change period`}
            className="flex h-9 items-center gap-2 rounded-full border border-dash-border bg-white px-3.5 text-[13px] font-medium text-brand-navy transition-colors hover:border-brand-primary/50 focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none"
          >
            <CalendarRange className="size-3.5 text-dash-muted" aria-hidden />
            {periodText}
          </button>
          <label className="sr-only" htmlFor="oh-annual-employer">
            Employer
          </label>
          <select
            id="oh-annual-employer"
            className={cn(
              "h-9 max-w-[220px] rounded-full border bg-white px-3.5 text-[13px] text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none",
              employer ? "border-brand-primary/50" : "border-dash-border",
            )}
            value={employer}
            onChange={(event) => onEmployerChange(event.target.value)}
          >
            <option value="">All employers</option>
            {employers.map((item) => (
              <option key={item.uuid} value={item.uuid}>
                {item.name}
              </option>
            ))}
          </select>
          <OhSegmented
            label="Report copy"
            role="radiogroup"
            value={audience}
            onChange={onAudienceChange}
            options={[
              { value: "employer", label: "Employer copy" },
              { value: "regulator", label: "Regulator copy" },
            ]}
          />
          <span className="hidden text-[12px] text-dash-muted xl:inline" data-testid="oh-annual-copy-hint">
            {audience === "employer" ? "Counts of 1–4 are hidden to protect individuals." : "Exact counts. Administrators only."}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Refresh"
            title="Refresh"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="flex size-9 items-center justify-center rounded-full text-dash-muted transition-colors hover:bg-dash-canvas hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "motion-safe:animate-spin")} aria-hidden />
          </button>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" disabled={!canPreview} onClick={onPreview}>
            <Eye className="size-3.5" aria-hidden /> Preview
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <a href={csvHref} data-testid="oh-annual-csv">
              <Download className="size-3.5" aria-hidden /> CSV
            </a>
          </Button>
          <Button asChild variant="primary" size="sm" className="gap-1.5">
            <a href={pdfHref} target="_blank" rel="noreferrer" data-testid="oh-annual-pdf">
              <Download className="size-3.5" aria-hidden /> PDF
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
