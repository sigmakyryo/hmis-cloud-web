import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One block of the annual dashboard, set straight on the page: a small heading (with an optional icon)
 * and its content. Space does the separating, so there is no box, border or fill.
 */
export function OhAnnualCard({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  id,
  testId,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  testId?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", className)} aria-labelledby={id} data-testid={testId}>
      <header className="flex items-center justify-between gap-3">
        <h3 id={id} className="flex items-center gap-2.5 text-[14px] font-semibold tracking-tight text-brand-navy">
          {Icon ? (
            <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-brand-tint text-brand-primary">
              <Icon className="size-4" />
            </span>
          ) : null}
          {title}
        </h3>
        {action}
      </header>
      <div className={cn("min-w-0 flex-1 pt-4", bodyClassName)}>{children}</div>
    </section>
  );
}
