"use client";

import Link from "next/link";

import type { FormReviewFinding } from "@/features/oh-template-builder/lib/dedicatedOhRecordPages";
import { cn } from "@/lib/utils";

type FormFieldReviewFlagProps = {
  finding: FormReviewFinding;
  onRemove?: () => void;
  className?: string;
};

export function FormFieldReviewFlag({ finding, onRemove, className }: FormFieldReviewFlagProps) {
  const pageLabel = finding.pageLabel || "Open page";
  return (
    <div
      data-testid="oh-form-review-flag"
      role="status"
      className={cn(
        "mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] leading-4 text-dash-muted",
        className,
      )}
    >
      <span className="inline-flex shrink-0 rounded-sm bg-amber-500/15 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-amber-800">
        Issue
      </span>
      <span className="text-brand-navy">{finding.reason}</span>
      {finding.suggestion ? <span>{finding.suggestion}</span> : null}
      {finding.href ? (
        <Link href={finding.href} className="font-medium text-brand-primary hover:underline">
          {pageLabel}
        </Link>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="font-medium text-brand-primary hover:underline"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
