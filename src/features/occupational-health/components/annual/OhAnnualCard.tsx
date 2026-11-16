import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The annual dashboard's one surface: a white card with a hairline border and a title with a line of
 * description. Every block on the page is one of these, so the page reads as a single system.
 */
export function OhAnnualCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
  testId,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  testId?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-dash-border bg-white", className)} aria-labelledby={id} data-testid={testId}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <h3 id={id} className="text-[15px] font-semibold tracking-tight text-brand-navy">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-[12.5px] text-dash-muted">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn("min-w-0 flex-1 px-5 pt-4 pb-5", bodyClassName)}>{children}</div>
    </section>
  );
}
