"use client";
import { SecondaryButton } from "@/components/ui/app-buttons";
import { useToast } from "@/providers/toast-provider";
import { QuietLoading } from "../shared/QuietLoading";
import { EmptyAction } from "../shared/EmptyAction";
import {
  downloadOhImmComplianceCsv,
} from "@/features/occupational-health/services/immunisation.service";

export function ComplianceOverview({
  data,
  loading,
}: {
  data:
    | {
        summary: {
          people: number;
          compliant: number;
          percent_compliant: number;
          overdue_rows: number;
        };
        groups: Array<{
          group: string;
          people: number;
          compliant: number;
          overdue: number;
          percent_compliant: number;
        }>;
        overdue: Array<Record<string, unknown>>;
      }
    | undefined;
  loading: boolean;
}) {
  const { toast } = useToast();
  if (loading) return <QuietLoading />;
  if (!data) {
    return (
      <EmptyAction
        title="No compliance data"
        description="Publish schedules with a fitness gate and refresh statuses."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-dash-muted">
          {data.summary.percent_compliant}% compliant · {data.summary.compliant}/
          {data.summary.people} people · {data.summary.overdue_rows} overdue rows
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
                description:
                  error instanceof Error ? error.message : "Try again.",
              });
            }
          }}
        >
          Export CSV
        </SecondaryButton>
      </div>
      <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
        {data.groups.map((g) => (
          <li
            key={g.group}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div>
              <p className="text-[13px] font-medium text-brand-navy">{g.group}</p>
              <p className="text-[12px] text-dash-muted">
                {g.compliant}/{g.people} compliant · {g.overdue} overdue
              </p>
            </div>
            <span className="text-[13px] font-medium text-brand-navy">
              {g.percent_compliant}%
            </span>
          </li>
        ))}
      </ul>
      {data.overdue.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] font-medium text-brand-navy">
            Overdue drill-down
          </p>
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {data.overdue.slice(0, 50).map((row, i) => (
              <li key={i} className="px-4 py-2 text-[13px] text-dash-muted">
                <span className="font-medium text-brand-navy">
                  {String(row.name || row.customer_uuid)}
                </span>
                {" · "}
                {String(row.vaccine_code)} · {String(row.status)}
                {row.employer ? ` · ${String(row.employer)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

