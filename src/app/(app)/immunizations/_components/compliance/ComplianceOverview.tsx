"use client";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { downloadOhImmComplianceCsv } from "@/features/occupational-health/services/immunisation.service";
import { useToast } from "@/providers/toast-provider";

import { EmptyAction } from "../shared/EmptyAction";
import { QuietLoading } from "../shared/QuietLoading";

export type ComplianceDashboard = {
  group_by?: string;
  summary?: {
    people: number;
    compliant: number;
    percent_compliant: number;
    overdue_rows: number;
  };
  groups?: Array<{
    group: string;
    people: number;
    compliant: number;
    overdue: number;
    percent_compliant: number;
  }>;
  overdue?: Array<Record<string, unknown>>;
};

export function ComplianceOverview({
  data,
  loading,
}: {
  data: ComplianceDashboard | undefined;
  loading: boolean;
}) {
  const { toast } = useToast();
  if (loading) return <QuietLoading />;

  const summary = data?.summary;
  const groups = data?.groups ?? [];
  const overdue = data?.overdue ?? [];

  if (!summary) {
    return (
      <EmptyAction
        title="No compliance data"
        description="Publish schedules with a fitness gate, then refresh statuses for employees."
      />
    );
  }

  if (summary.people === 0 && groups.length === 0) {
    return (
      <EmptyAction
        title="Nobody is on a gated schedule yet"
        description="When published schedules with a fitness gate match employees, coverage appears here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-dash-muted">
          {summary.percent_compliant}% compliant · {summary.compliant}/{summary.people} people ·{" "}
          {summary.overdue_rows} overdue rows
        </p>
        <SecondaryButton
          type="button"
          onClick={async () => {
            try {
              const { blob, filename } = await downloadOhImmComplianceCsv();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            } catch (error) {
              toast({
                variant: "error",
                title: "Export failed",
                description: error instanceof Error ? error.message : "Try again.",
              });
            }
          }}
        >
          Export CSV
        </SecondaryButton>
      </div>
      <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
        {groups.map((g) => (
          <li key={g.group} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-sm font-medium text-brand-navy">{g.group}</span>
            <span className="text-[13px] text-dash-muted">
              {g.percent_compliant}% · {g.compliant}/{g.people} · {g.overdue} overdue
            </span>
          </li>
        ))}
      </ul>
      {overdue.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-primary">Overdue / due rows</h3>
          <ul className="text-sm">
            {overdue.slice(0, 50).map((row, i) => (
              <li key={`${String(row.customer_uuid)}-${String(row.vaccine_code)}-${i}`} className="border-b border-border/60 py-1 text-muted-foreground">
                <span className="font-mono text-xs">{String(row.customer_uuid ?? "").slice(0, 8)}</span>
                {" · "}
                {String(row.vaccine_code)} · {String(row.status)}
                {row.next_due_date ? ` · due ${String(row.next_due_date)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
