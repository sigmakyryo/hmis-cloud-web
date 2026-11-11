"use client";

import { BellRing, CalendarPlus, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ROUTES } from "@/constants/routes";
import {
  formatDate,
  relativeDue,
  type OhWorkRow,
} from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import { appFont } from "@/lib/fonts";

type OhRequirementSheetProps = {
  row: OhWorkRow | null;
  onOpenChange: (open: boolean) => void;
  onSchedule: (row: OhWorkRow) => void;
  onRecall: (row: OhWorkRow) => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-dash-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] text-brand-navy">{value || "—"}</dd>
    </div>
  );
}

/** Details for one due / overdue surveillance requirement, with the next actions. */
export function OhRequirementSheet({ row, onOpenChange, onSchedule, onRecall }: OhRequirementSheetProps) {
  return (
    <Sheet open={row !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={`${appFont.className} flex w-[92vw] flex-col gap-0 p-0 sm:max-w-md`} data-testid="oh-requirement-sheet">
        {row ? (
          <>
            <SheetHeader className="border-b border-dash-border px-5 py-4 text-left">
              <div className="flex items-center gap-2">
                <Badge variant={row.overdue ? "destructive" : "warning"}>{row.overdue ? "Overdue" : "Due"}</Badge>
                <span className="text-[12px] tabular-nums text-dash-muted">{relativeDue(row.days)}</span>
              </div>
              <SheetTitle className="text-base text-brand-navy">{row.customer_name || "Worker"}</SheetTitle>
              <SheetDescription className="text-[13px] text-dash-muted">
                {row.component_code} · {row.examLabel} · due {formatDate(row.due_date)}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label="Worker ID" value={row.customer_identifier} />
                <Field label="Employer" value={row.employer} />
                <Field label="Job title" value={row.job_title} />
                <Field label="Hazard profile" value={row.hazard_profile} />
                <Field label="Site" value={row.site} />
                <Field label="Department" value={row.department_name} />
                <Field label="Exam component" value={row.component_code} />
                <Field label="Exam type" value={row.examLabel} />
              </dl>
              <div className="rounded-lg border border-dash-border bg-dash-canvas/50 px-3 py-2.5 text-[12px] text-brand-slate">
                The requirement closes automatically when a matching exam is completed for this worker.
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-dash-border px-5 py-3 sm:flex-row sm:justify-end">
              {row.customer_uuid ? (
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link href={ROUTES.occupationalHealthEmployment(row.customer_uuid)}>
                    <ExternalLink className="size-3.5" aria-hidden /> Worker record
                  </Link>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!row.uuid} onClick={() => onRecall(row)}>
                <BellRing className="size-3.5" aria-hidden /> Send recall
              </Button>
              <Button type="button" variant="primary" size="sm" className="gap-1.5" disabled={!row.customer_uuid} onClick={() => onSchedule(row)}>
                <CalendarPlus className="size-3.5" aria-hidden /> Schedule exam
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
