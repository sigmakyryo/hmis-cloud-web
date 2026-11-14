import type { ReactNode } from "react";

import { PAGE_SECTION_TITLE_CLASS, PAGE_STAT_LABEL_CLASS } from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";

/** A section heading with an optional action on the right; sections are separated by whitespace and hairlines, not boxes. */
export function IodSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-6 first:pt-0", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className={PAGE_SECTION_TITLE_CLASS}>{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-brand-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small caption above a value. */
export function IodFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={PAGE_STAT_LABEL_CLASS}>{label}</dt>
      <dd className="mt-1 break-words text-sm text-brand-navy">{children}</dd>
    </div>
  );
}

export function IodEmpty({ children = "Not recorded" }: { children?: ReactNode }) {
  return <span className="text-brand-muted">{children}</span>;
}

/** Free-text answer with a quiet prompt to add it when nothing has been recorded. */
export function IodNarrative({
  label,
  text,
  onAdd,
}: {
  label: string;
  text: string;
  onAdd?: () => void;
}) {
  const hasText = text.trim().length > 0;
  return (
    <div className="min-w-0">
      <p className={PAGE_STAT_LABEL_CLASS}>{label}</p>
      {hasText ? (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-brand-navy">{text}</p>
      ) : (
        <p className="mt-1.5 text-sm text-brand-muted">
          Nothing recorded yet.
          {onAdd ? (
            <>
              {" "}
              <button type="button" onClick={onAdd} className="font-medium text-brand-primary hover:underline">
                Add details
              </button>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
