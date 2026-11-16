"use client";

import { Download, Eye, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OhAnnualEmployerSelect } from "@/features/occupational-health/components/annual/OhAnnualEmployerSelect";
import { OhAnnualPeriodPicker } from "@/features/occupational-health/components/annual/OhAnnualPeriodPicker";
import type { AnnualPeriod } from "@/features/occupational-health/components/annual/annual-utils";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import type { AnnualAudience } from "@/features/occupational-health/services/oh-annual-report.service";
import { cn } from "@/lib/utils";

/** What the report covers on the left, what you can do with it on the right. */
export function OhAnnualToolbar({
  period,
  onPeriodChange,
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
  period: AnnualPeriod;
  onPeriodChange: (period: AnnualPeriod) => void;
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
    <div data-list-band className="sticky top-0 z-10 w-full border-b border-dash-border bg-white/90 px-5 py-3 backdrop-blur md:px-8 print:hidden">
      <h1 className="sr-only">Annual report</h1>
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5" role="toolbar" aria-label="Report options">
          <OhAnnualPeriodPicker value={period} onApply={onPeriodChange} />
          <OhAnnualEmployerSelect employers={employers} value={employer} onChange={onEmployerChange} />
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
        </div>
        <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Report actions">
          <button
            type="button"
            aria-label="Refresh"
            title="Refresh"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="flex size-9 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-canvas hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none disabled:opacity-50"
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
