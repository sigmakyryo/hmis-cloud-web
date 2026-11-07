"use client";

import { useState } from "react";
import Link from "next/link";

import { AppIcon } from "@/components/icons/app-icon";
import { ReportsNav } from "@/features/reports/components/ReportsNav";
import { ReportCanvas } from "@/features/reports/components/ReportCanvas";
import {
  getReportCatalogItem,
  REPORT_CATALOG,
} from "@/features/reports/constants/report-catalog";
import { ROUTES } from "@/constants/routes";

function readInitialReportId(): string {
  if (typeof window === "undefined") {
    return REPORT_CATALOG[0]?.id ?? "sales_orders";
  }
  const type = new URLSearchParams(window.location.search).get("type");
  return getReportCatalogItem(type ?? "")?.id ?? REPORT_CATALOG[0]?.id ?? "sales_orders";
}

export function ReportsWorkspace() {
  const [reportId, setReportId] = useState(readInitialReportId);
  const report = getReportCatalogItem(reportId) ?? REPORT_CATALOG[0];

  function selectReport(nextId: string) {
    setReportId(nextId);
    const url = new URL(window.location.href);
    url.searchParams.set("type", nextId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  if (!report) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 w-full" data-testid="reports-workspace">
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-dash-border bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <ReportsNav selectedId={report.id} onSelect={selectReport} />
        </div>
        <div className="shrink-0 border-t border-dash-border px-3 py-3">
          <Link
            href={ROUTES.reportsExportHistory}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-brand-slate transition-colors hover:bg-dash-canvas hover:text-brand-navy"
            data-testid="report-export-history-link"
          >
            <AppIcon name="calendarClock" size={15} />
            Export history
          </Link>
        </div>
      </aside>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <ReportCanvas key={report.id} report={report} />
      </div>
    </div>
  );
}
