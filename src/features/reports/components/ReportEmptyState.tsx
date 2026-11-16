import { EmptyIllustration } from "@/components/illustrations/empty-illustration";
import { Button } from "@/components/ui/button";

/**
 * Shown in place of the charts when a report has nothing in the chosen period: a picture, a plain line,
 * and, for reports with a date range, a way to widen it.
 */
export function ReportEmptyState({ onWiden }: { onWiden?: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center" data-testid="report-empty">
      <EmptyIllustration variant="documents" className="h-32" />
      <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-brand-navy">Nothing to report for this period</h3>
      <p className="mt-1 max-w-sm text-sm text-brand-muted">There are no records in these dates. Try a wider range or clear a filter.</p>
      {onWiden ? (
        <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onWiden} data-testid="report-empty-widen">
          Show year to date
        </Button>
      ) : null}
    </div>
  );
}
