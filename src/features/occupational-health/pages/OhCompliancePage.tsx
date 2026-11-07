"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageHeaderActions,
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { useOhComplianceDashboard } from "@/features/occupational-health/hooks/use-occupational-health";
import { downloadOhComplianceExtract } from "@/features/occupational-health/services/oh.service";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/providers/toast-provider";

const METRIC_LABELS: Record<string, string> = {
  due: "Due",
  overdue: "Overdue",
  completed: "Completed",
  waived: "Waived",
  open_episodes: "Open employment episodes",
  due_within_30_days: "Due within 30 days",
  fitness_validity_alerts: "Fitness validity alerts",
};

export function OhCompliancePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const { data, isLoading, error, refetch, isFetching } =
    useOhComplianceDashboard();
  const [isExtracting, setIsExtracting] = useState(false);

  const hasAccess = canAccessOccupationalHealth(userData);

  async function handleExtract() {
    setIsExtracting(true);
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
        description:
          extractError instanceof Error ? extractError.message : undefined,
        variant: "error",
      });
    } finally {
      setIsExtracting(false);
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

  return (
    <ListPageLayout data-testid="oh-compliance-page">
      <ListPageHeaderSection className="bg-white">
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock
            title="OHS Compliance"
            description="Surveillance requirement counts for your organization."
          />
          <ListPageHeaderActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-dash-border text-xs text-brand-slate"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleExtract()}
              disabled={isExtracting}
            >
              {isExtracting ? "Exporting…" : "Download extract"}
            </Button>
          </ListPageHeaderActions>
        </ListPageHeaderTopRow>
      </ListPageHeaderSection>

      <ListPageTableSection>
        {isLoading ? (
          <p className="text-sm text-brand-muted">Loading compliance…</p>
        ) : error ? (
          <ListPageBlankState
            compact
            tone="error"
            icon="file"
            title="Could not load compliance dashboard"
            description="The compliance figures could not be loaded."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg text-[13px]"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            }
          />
        ) : (
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-dash-border px-4 py-2.5 md:px-6"
            role="group"
            aria-label="Compliance summary"
          >
            {Object.entries(data ?? {}).map(([key, value]) => (
              <p
                key={key}
                className="flex items-baseline gap-1.5"
                data-testid={`oh-compliance-metric-${key}`}
              >
                <span className="text-[15px] font-semibold tabular-nums leading-none text-brand-navy">
                  {value}
                </span>
                <span className="text-[13px] text-dash-muted">
                  {METRIC_LABELS[key] ?? key.replace(/_/g, " ")}
                </span>
              </p>
            ))}
          </div>
        )}
      </ListPageTableSection>
    </ListPageLayout>
  );
}
