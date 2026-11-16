import { TrendingDown, TrendingUp } from "lucide-react";

import { describeChange, type AnnualChange } from "@/features/occupational-health/components/annual/annual-changes";
import { OhAnnualCard } from "@/features/occupational-health/components/annual/OhAnnualCard";
import { cn } from "@/lib/utils";

function Group({ title, tone, changes, testId }: { title: string; tone: "good" | "bad"; changes: AnnualChange[]; testId: string }) {
  const Icon = tone === "good" ? TrendingUp : TrendingDown;
  return (
    <div data-testid={testId}>
      <h4 className={cn("flex items-center gap-1.5 text-[12px] font-semibold", tone === "good" ? "text-brand-primary" : "text-red-700")}>
        <Icon className="size-3.5" aria-hidden />
        {title}
      </h4>
      {changes.length === 0 ? (
        <p className="mt-1.5 text-[12px] text-dash-muted">Nothing moved noticeably the {tone === "good" ? "right" : "wrong"} way.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5 text-[12.5px] leading-snug text-brand-navy">
          {changes.map((change) => (
            <li key={change.figure.key}>{describeChange(change)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The biggest moves against the year before, in plain sentences: good news first, then what to look at. */
export function OhAnnualChangesPanel({
  better,
  worse,
  compareYear,
  noCompareText,
  className,
}: {
  better: AnnualChange[];
  worse: AnnualChange[];
  compareYear: number | null;
  /** Why nothing is compared, shown when compareYear is null. */
  noCompareText: string;
  className?: string;
}) {
  return (
    <OhAnnualCard
      id="oh-annual-changes"
      testId="oh-annual-changes"
      className={className}
      title={compareYear !== null ? `What changed since ${compareYear}` : "What changed"}
    >
      {compareYear === null ? (
        <p className="text-[12.5px] text-dash-muted">{noCompareText}</p>
      ) : (
        <div className="space-y-5">
          <Group title="Moving the right way" tone="good" changes={better} testId="oh-annual-better" />
          <Group title="Worth a look" tone="bad" changes={worse} testId="oh-annual-worse" />
        </div>
      )}
    </OhAnnualCard>
  );
}
