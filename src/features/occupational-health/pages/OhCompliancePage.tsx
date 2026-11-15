"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Download, ListChecks, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhExamBatteryRulesPanel } from "@/features/occupational-health/components/OhExamBatteryRulesPanel";
import { OhVisitCancellationsReport } from "@/features/occupational-health/components/OhVisitCancellationsReport";
import { OhExportDialog } from "@/features/occupational-health/components/dashboard/OhExportDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { OhComplianceAttention, type OhAttentionItem } from "@/features/occupational-health/components/compliance/OhComplianceAttention";
import { OhComplianceHero, type OhCompliancePeriod } from "@/features/occupational-health/components/compliance/OhComplianceHero";
import { OhComplianceHotspots, type OhComplianceDimension } from "@/features/occupational-health/components/compliance/OhComplianceHotspots";
import { OhSection } from "@/features/occupational-health/components/dashboard/OhSection";
import { surveillanceHref } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import { ROUTES } from "@/constants/routes";
import { openFile } from "@/features/occupational-health/components/dashboard/oh-table";
import { useOhComplianceDashboard } from "@/features/occupational-health/hooks/use-occupational-health";
import { cancellationReportCsvUrl, fetchComplianceInsights } from "@/features/occupational-health/services/oh-ext.service";
import { downloadOhComplianceExtract } from "@/features/occupational-health/services/oh.service";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/providers/toast-provider";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function OhCompliancePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const dashboard = useOhComplianceDashboard();
  const [months, setMonths] = useState<OhCompliancePeriod>("12");
  const insights = useQuery({
    queryKey: ["oh-compliance-insights", Number(months)],
    queryFn: () => fetchComplianceInsights(Number(months)),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const [breakdown, setBreakdown] = useState<OhComplianceDimension>("by_hazard_profile");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => isoDaysAgo(90));
  const [exportTo, setExportTo] = useState(() => isoDaysAgo(0));
  const hasAccess = canAccessOccupationalHealth(userData);

  async function handleExtract() {
    try {
      const { blob, filename } = await downloadOhComplianceExtract();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ variant: "success", title: "Compliance CSV downloaded" });
    } catch (extractError) {
      toast({
        title: "Extract failed",
        description: extractError instanceof Error ? extractError.message : undefined,
        variant: "error",
      });
    }
  }

  if (isUserLoading) {
    return (
      <ListPageLayout data-testid="oh-compliance-page">
        <div className="p-8 text-sm text-brand-muted">Loading compliance…</div>
      </ListPageLayout>
    );
  }

  if (!hasAccess) {
    return (
      <OhAccessDenied
        data-testid="oh-compliance-page"
        description="Occupational health compliance is limited to users in the OccupationalHealth group. Ask an administrator to grant access for this workspace."
      />
    );
  }

  const d = dashboard.data;
  const i = insights.data;
  const surveillance = (link: Parameters<typeof surveillanceHref>[1]) => surveillanceHref(ROUTES.occupationalHealthSurveillance, link);
  const completedDelta = i ? i.completed.last_30_days - i.completed.previous_30_days : null;
  const attention: OhAttentionItem[] = [
    {
      key: "overdue",
      value: d?.overdue ?? null,
      label: "checks overdue",
      hint: i && i.due_windows.overdue_30_plus > 0 ? `${i.due_windows.overdue_30_plus} more than 30 days late` : undefined,
      href: surveillance({ status: "overdue" }),
      tone: "danger",
    },
    {
      key: "due_within_30_days",
      value: d?.due_within_30_days ?? null,
      label: "due in the next 30 days",
      hint: d ? `${d.due} due in all` : undefined,
      href: surveillance({ due: "next_30" }),
      tone: "warning",
    },
    {
      key: "fitness_validity_alerts",
      value: d?.fitness_validity_alerts ?? null,
      label: "fitness certificates expire within 30 days",
      href: surveillance({}),
      tone: "warning",
    },
    {
      key: "completed30",
      value: i?.completed.last_30_days ?? null,
      label: "checks done in the last 30 days",
      hint:
        completedDelta === null ? undefined : (
          <span className={completedDelta >= 0 ? "text-brand-primary" : "text-red-700"}>
            {completedDelta >= 0 ? `+${completedDelta}` : completedDelta} on the 30 days before
          </span>
        ),
    },
    { key: "open_episodes", value: d?.open_episodes ?? null, label: "workers on file", hint: "with open employment", href: ROUTES.occupationalHealthEmployees },
  ];
  const refreshing = dashboard.isFetching || insights.isFetching;

  const updatedAt = dashboard.dataUpdatedAt ? format(new Date(dashboard.dataUpdatedAt), "HH:mm") : null;

  return (
    <ListPageLayout data-testid="oh-compliance-page">
      <h1 className="sr-only">Compliance</h1>
      <div data-list-band className="px-4 pb-10 md:px-6">
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-border/70 py-3"
          role="toolbar"
          aria-label="Compliance actions"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-[12px] text-dash-muted hover:text-brand-navy"
            aria-label="Refresh"
            disabled={refreshing}
            onClick={() => {
              void dashboard.refetch();
              void insights.refetch();
            }}
          >
            <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
            <span>{refreshing ? "Refreshing…" : updatedAt ? `Updated ${updatedAt}` : "Refresh"}</span>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild type="button" variant="ghost" size="sm" className="h-8 gap-1.5">
              <a href="#oh-exam-battery-rules">
                <ListChecks className="size-3.5" aria-hidden /> Rules
              </a>
            </Button>
            <Button type="button" variant="primary" size="sm" className="h-8 gap-1.5" onClick={() => setExportOpen(true)}>
              <Download className="size-3.5" aria-hidden /> Export
            </Button>
          </div>
        </div>

        {dashboard.error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 py-2.5 text-[13px] text-red-800" role="alert">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4" aria-hidden />
              Could not load compliance dashboard. The compliance figures could not be loaded.
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-800" onClick={() => void dashboard.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        <div className="border-b border-dash-border/70 py-8">
          {insights.isLoading ? (
            <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]" aria-busy="true">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : i ? (
            <OhComplianceHero insights={i} period={months} onPeriodChange={setMonths} />
          ) : (
            <p className="text-[13.5px] text-dash-muted" role="alert">
              The compliance trend could not be loaded.{" "}
              <button type="button" className="font-medium text-brand-primary hover:underline" onClick={() => void insights.refetch()}>
                Try again
              </button>
            </p>
          )}
        </div>

        <div className="grid gap-x-14 gap-y-10 border-b border-dash-border/70 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <OhSection title="Needs attention" description="Each line opens the work behind it.">
            <OhComplianceAttention items={attention} isLoading={dashboard.isLoading} />
          </OhSection>
          <OhComplianceHotspots insights={i} dimension={breakdown} onDimensionChange={setBreakdown} />
        </div>

        <div className="border-b border-dash-border/70 py-8">
          <OhExamBatteryRulesPanel />
        </div>
        <div className="pt-8">
          <OhVisitCancellationsReport />
        </div>
      </div>

      <OhExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export compliance"
        description="The period applies to the cancellations report; the extract always covers every requirement."
        options={[
          { id: "extract", label: "Compliance extract (CSV)", description: "Every surveillance requirement with status, exam and due date.", format: "csv", run: handleExtract },
          {
            id: "cancellations",
            label: "Cancellations and no-shows (CSV)",
            description: "Visit-level rows for the chosen period.",
            format: "csv",
            run: () => openFile(cancellationReportCsvUrl({ from: exportFrom, to: exportTo }), true),
          },
          { id: "print", label: "Print this dashboard", description: "Opens the browser print dialog (save as PDF from there).", format: "print", run: () => window.print() },
        ]}
      >
        <div className="space-y-1.5">
          <Label htmlFor="oh-export-from">From</Label>
          <Input id="oh-export-from" type="date" value={exportFrom} max={exportTo} onChange={(e) => setExportFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-export-to">To</Label>
          <Input id="oh-export-to" type="date" value={exportTo} min={exportFrom} onChange={(e) => setExportTo(e.target.value)} />
        </div>
      </OhExportDialog>
    </ListPageLayout>
  );
}
