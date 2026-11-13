"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type OhVisitPanelEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/** Compact empty state for a visit workspace panel, with an action to the page where you add or configure this record. */
export function OhVisitPanelEmptyState({
  icon,
  title,
  description,
  action,
  className,
  "data-testid": testId,
}: OhVisitPanelEmptyStateProps) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={cn("px-2 py-8", className)}
      data-testid={testId}
    />
  );
}
