import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A plain section: sentence-case heading, an optional line under it, and controls on the right. */
export function OhSection({
  title,
  description,
  action,
  children,
  className,
  testId,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
  id?: string;
}) {
  return (
    <section id={id} data-testid={testId} aria-label={title} className={cn("min-w-0", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-brand-navy">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-dash-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
