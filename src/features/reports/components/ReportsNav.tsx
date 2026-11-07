"use client";

import { AppIcon } from "@/components/icons/app-icon";
import {
  getReportCatalogSections,
  type ReportCatalogItem,
} from "@/features/reports/constants/report-catalog";
import { cn } from "@/lib/utils";

type ReportsNavProps = {
  selectedId: string;
  onSelect: (reportId: string) => void;
};

function ReportNavButton({
  report,
  selected,
  onSelect,
}: {
  report: ReportCatalogItem;
  selected: boolean;
  onSelect: (reportId: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      data-testid={`report-nav-${report.id}`}
      onClick={() => onSelect(report.id)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-dash-canvas font-medium text-brand-navy"
          : "text-brand-slate hover:bg-dash-canvas hover:text-brand-navy",
      )}
    >
      <AppIcon
        name={report.icon}
        size={15}
        className="shrink-0 opacity-70"
      />
      <span className="truncate">{report.title}</span>
    </button>
  );
}

export function ReportsNav({ selectedId, onSelect }: ReportsNavProps) {
  const sections = getReportCatalogSections();

  return (
    <nav aria-label="Reports" data-testid="reports-nav">
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.id} className="space-y-0.5">
            <h2 className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wide text-brand-muted">
              {section.title}
            </h2>
            {section.items.map((report) => (
              <ReportNavButton
                key={report.id}
                report={report}
                selected={report.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </section>
        ))}
      </div>
    </nav>
  );
}
