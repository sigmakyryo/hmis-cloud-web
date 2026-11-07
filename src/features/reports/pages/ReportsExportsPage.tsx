"use client";

import { ReportsWorkspace } from "@/features/reports/components/ReportsWorkspace";

export function ReportsExportsPage() {
  return (
    <div
      className="absolute inset-0 flex min-h-0 overflow-hidden bg-white"
      data-testid="reports-exports-page"
    >
      <ReportsWorkspace />
    </div>
  );
}
