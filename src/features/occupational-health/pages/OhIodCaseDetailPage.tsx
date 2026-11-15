"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  DetailPageLayout,
  DetailPageMainAsideGrid,
  DetailPageMainSection,
  DetailPageNotFound,
  DetailPageSkeleton,
  DetailPageTabNavItem,
  DetailPageTabsNavSection,
  DetailPageTabsSection,
} from "@/features/app-shell/components/page-layout";
import { IodCaseAside } from "@/features/occupational-health/iod-case/components/IodCaseAside";
import { IodCaseCloseDialog } from "@/features/occupational-health/iod-case/components/IodCaseCloseDialog";
import { IodCaseActionSheet } from "@/features/occupational-health/iod-case/components/IodCaseActionSheet";
import { IodCaseFactsStrip } from "@/features/occupational-health/iod-case/components/IodCaseFactsStrip";
import { IodCaseFollowUpTab } from "@/features/occupational-health/iod-case/components/IodCaseFollowUpTab";
import { IodCaseHeader } from "@/features/occupational-health/iod-case/components/IodCaseHeader";
import { IodCaseNotificationsTab } from "@/features/occupational-health/iod-case/components/IodCaseNotificationsTab";
import { IodCaseOverviewTab } from "@/features/occupational-health/iod-case/components/IodCaseOverviewTab";
import { IodCaseTimelineTab } from "@/features/occupational-health/iod-case/components/IodCaseTimelineTab";
import { stillToRecord, type IodActionId } from "@/features/occupational-health/iod-case/iod-case.actions";
import { countActions, summariseNotices } from "@/features/occupational-health/iod-case/iod-case.utils";
import { useDraftIodFromVisit, useIodCase, useUpdateIodCase } from "@/features/occupational-health/iod-case/use-iod-case";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notifications", label: "Notifications" },
  { id: "follow-up", label: "Follow-up" },
  { id: "timeline", label: "Timeline" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null | undefined): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

/** Active tab lives in `?tab=` so a reload or a shared link lands on the same section. */
function useCaseTab(): [TabId, (tab: TabId) => void] {
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<TabId>(() => {
    const requested = searchParams?.get("tab");
    return isTabId(requested) ? requested : "overview";
  });

  function setTab(next: TabId) {
    setTabState(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  return [tab, setTab];
}

function TabCount({ value, alert = false }: { value: number; alert?: boolean }) {
  if (value <= 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums",
        alert ? "bg-amber-100 text-amber-900" : "bg-dash-canvas text-brand-muted",
      )}
    >
      {value}
    </span>
  );
}

export function OhIodCaseDetailPage({ uuid }: { uuid: string }) {
  const { toast } = useToast();
  const { detail, pack, entries } = useIodCase(uuid);
  const update = useUpdateIodCase(uuid);
  const draft = useDraftIodFromVisit(uuid);
  const [tab, setTab] = useCaseTab();
  const [action, setAction] = useState<IodActionId | null>(null);
  const [closing, setClosing] = useState(false);
  const [today] = useState(() => new Date());

  if (detail.isLoading) return <DetailPageSkeleton data-testid="oh-record-detail" />;
  if (detail.isError || !detail.data) {
    return (
      <DetailPageLayout data-testid="oh-record-detail">
        <DetailPageNotFound title="Case not found" message="This injury case could not be loaded. It may have been removed, or you may not have access to it." />
      </DetailPageLayout>
    );
  }

  const item = detail.data;
  const timeline = entries.data ?? [];
  const notices = summariseNotices(pack.data?.notifications ?? []);
  const actions = countActions(timeline, today);
  const todo = stillToRecord(item, notices.needAttention);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ variant: "success", title: "Link copied" });
    } catch {
      toast({ variant: "error", title: "Could not copy the link" });
    }
  }

  return (
    <DetailPageLayout data-testid="oh-record-detail">
      <IodCaseHeader
        item={item}
        pack={pack.data}
        isSaving={update.isPending}
        onEdit={() => setAction("edit")}
        onRecord={setAction}
        onAddNote={() => setTab("timeline")}
        onClose={() => setClosing(true)}
        onReopen={() => update.mutate({ status: "open" })}
        onMarkUnderReview={() => update.mutate({ status: "under_review" })}
        onCopyLink={() => void copyLink()}
        onDraftFromVisit={() => draft.mutate()}
        isDrafting={draft.isPending}
      />
      <IodCaseFactsStrip item={item} pack={pack.data} entries={timeline} today={today} />

      <DetailPageTabsSection>
        <DetailPageTabsNavSection aria-label="Case sections">
          {TABS.map((entry) => (
            <DetailPageTabNavItem key={entry.id} isActive={tab === entry.id} onClick={() => setTab(entry.id)}>
              {entry.label}
              {entry.id === "notifications" ? <TabCount value={notices.needAttention} alert /> : null}
              {entry.id === "follow-up" ? <TabCount value={actions.open} alert={actions.overdue > 0} /> : null}
              {entry.id === "timeline" ? <TabCount value={timeline.length} /> : null}
            </DetailPageTabNavItem>
          ))}
        </DetailPageTabsNavSection>

        <DetailPageMainAsideGrid className="flex-1">
          <DetailPageMainSection className="py-6">
            {tab === "overview" ? <IodCaseOverviewTab item={item} todo={todo} onAction={setAction} onOpenTab={setTab} /> : null}
            {tab === "notifications" ? <IodCaseNotificationsTab item={item} pack={pack.data} packFailed={pack.isError} /> : null}
            {tab === "follow-up" ? <IodCaseFollowUpTab caseUuid={uuid} entries={timeline} today={today} /> : null}
            {tab === "timeline" ? <IodCaseTimelineTab caseUuid={uuid} entries={timeline} isLoading={entries.isLoading} /> : null}
          </DetailPageMainSection>
          <IodCaseAside item={item} pack={pack.data} />
        </DetailPageMainAsideGrid>
      </DetailPageTabsSection>

      <IodCaseActionSheet
        item={item}
        actionId={action}
        isSaving={update.isPending}
        onClose={() => setAction(null)}
        onSave={(changes) => update.mutate(changes, { onSuccess: () => setAction(null) })}
      />
      <IodCaseCloseDialog
        item={item}
        open={closing}
        isSaving={update.isPending}
        onOpenChange={setClosing}
        onConfirm={(changes) => update.mutate(changes, { onSuccess: () => setClosing(false) })}
      />
    </DetailPageLayout>
  );
}
