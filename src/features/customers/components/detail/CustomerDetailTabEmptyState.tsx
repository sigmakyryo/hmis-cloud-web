import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CustomerDetailTabEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function CustomerDetailTabEmptyState({
  title,
  description,
  action,
  className,
  "data-testid": testId,
}: CustomerDetailTabEmptyStateProps) {
  return (
    <div className={cn("max-w-md py-6", className)} data-testid={testId}>
      <h3 className="text-[15px] font-semibold text-brand-navy">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-dash-muted">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
