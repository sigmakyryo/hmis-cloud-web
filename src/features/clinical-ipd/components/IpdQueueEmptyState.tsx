import type { ReactNode } from "react";

type IpdQueueEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

/** Centered IPD queue empty state. No icon tile and no bordered card. */
export function IpdQueueEmptyState({ title, description, action }: IpdQueueEmptyStateProps) {
  return (
    <div
      data-list-band
      data-testid="ipd-queue-empty-state"
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 text-center"
    >
      <h2 className="text-[17px] font-semibold tracking-tight text-brand-navy">{title}</h2>
      <p className="mt-1.5 max-w-sm text-[13.5px] leading-6 text-dash-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
