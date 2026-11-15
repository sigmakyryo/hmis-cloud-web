import { Coffee } from "lucide-react";

type OhQueueEmptyStateProps = {
  onRefresh: () => void;
};

export function OhQueueEmptyState({ onRefresh }: OhQueueEmptyStateProps) {
  return (
    <div className="flex flex-col items-start px-5 py-16 md:px-8" data-testid="oh-queue-empty-state">
      <Coffee className="size-6 text-dash-muted" strokeWidth={1.75} aria-hidden="true" />
      <h2 className="mt-4 text-[17px] font-semibold text-brand-navy">Nobody in the queue</h2>
      <p className="mt-1 max-w-sm text-[13.5px] text-dash-muted">
        Clients appear here once they are checked in to an occupational health department.
      </p>
      <button
        type="button"
        className="mt-4 text-[13.5px] font-semibold text-brand-primary hover:underline"
        onClick={onRefresh}
        data-testid="oh-queue-empty-refresh-button"
      >
        Check again
      </button>
    </div>
  );
}
