"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { FormReviewFinding } from "@/features/oh-template-builder/lib/dedicatedOhRecordPages";
import { cn } from "@/lib/utils";

type FormFieldReviewFlagProps = {
  finding: FormReviewFinding;
  onRemove?: () => void;
  className?: string;
};

/** Small amber mark for a section or field title. Use instead of an "Issue" text badge. */
export function FormFieldIssueIcon({ className, label = "Issue" }: { className?: string; label?: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      data-testid="oh-form-review-issue-icon"
      className={cn("inline-flex shrink-0 align-middle text-amber-600", className)}
    >
      <AlertTriangle className="size-3.5" strokeWidth={2} aria-hidden />
    </span>
  );
}

export function FormFieldReviewFlag({ finding, onRemove, className }: FormFieldReviewFlagProps) {
  const pageLabel = finding.pageLabel || "Open page";
  return (
    <div
      data-testid="oh-form-review-flag"
      role="status"
      className={cn(
        "mt-1 min-w-0 w-full max-w-full text-[11px] leading-4 text-dash-muted",
        className,
      )}
    >
      <p className="min-w-0 whitespace-normal break-words text-brand-navy">{finding.reason}</p>
      {finding.suggestion ? (
        <p className="mt-0.5 min-w-0 whitespace-normal break-words">{finding.suggestion}</p>
      ) : null}
      {finding.href || onRemove ? (
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
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
        </p>
      ) : null}
    </div>
  );
}
