"use client";

import { HardHat } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";
import { IodCaseCreateDialog } from "@/features/occupational-health/components/IodCaseCreateDialog";
import { IodCaseGroup } from "@/features/occupational-health/components/IodCaseRows";
import { IodCasesToolbar } from "@/features/occupational-health/components/IodCasesToolbar";
import { groupCases, isClosed, matchesCase, type IodListSeverity, type IodListStatus } from "@/features/occupational-health/lib/iod-case-list";
import { fetchIodCases, updateIodCase } from "@/features/occupational-health/services/oh.service";
import type { IodCase } from "@/features/occupational-health/types";
import { ROUTES } from "@/constants/routes";
import { useToast } from "@/providers/toast-provider";

const CLOSED_SHOWN = 8;

export function OhIodCasesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const cases = useQuery({ queryKey: ["oh-iod-cases"], queryFn: fetchIodCases });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IodListStatus>("all");
  const [severity, setSeverity] = useState<IodListSeverity>("all");
  const [creating, setCreating] = useState(false);
  const [showAllClosed, setShowAllClosed] = useState(false);

  const all = useMemo(() => cases.data ?? [], [cases.data]);
  const filtered = useMemo(() => all.filter((row) => matchesCase(row, search, status, severity)), [all, search, status, severity]);
  const { open, closed } = useMemo(() => groupCases(filtered), [filtered]);
  const counts = useMemo(() => {
    const bySearch = all.filter((row) => matchesCase(row, search, "all", severity));
    return {
      all: bySearch.length,
      open: bySearch.filter((row) => (row.status || "open") === "open").length,
      under_review: bySearch.filter((row) => row.status === "under_review").length,
      closed: bySearch.filter(isClosed).length,
    };
  }, [all, search, severity]);

  const setStatusOf = useMutation({
    mutationFn: ({ row, next }: { row: IodCase; next: "open" | "under_review" }) => updateIodCase(row.uuid, { status: next }),
    onSuccess: async () => {
      toast({ variant: "success", title: "Case updated" });
      await queryClient.invalidateQueries({ queryKey: ["oh-iod-cases"] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not update the case", description: error instanceof Error ? error.message : undefined }),
  });

  async function copyLink(row: IodCase) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${ROUTES.occupationalHealthRecord("iod", row.uuid)}`);
      toast({ variant: "success", title: "Link copied" });
    } catch {
      toast({ variant: "error", title: "Could not copy the link" });
    }
  }

  const rowActions = { onSetStatus: (row: IodCase, next: "open" | "under_review") => setStatusOf.mutate({ row, next }), onCopyLink: (row: IodCase) => void copyLink(row), isSaving: setStatusOf.isPending };
  const isEmpty = !cases.isLoading && !cases.isError && all.length === 0;
  const nothingMatches = !cases.isLoading && all.length > 0 && filtered.length === 0;
  const shownClosed = showAllClosed ? closed : closed.slice(0, CLOSED_SHOWN);

  return (
    <ListPageLayout data-testid="oh-iod-cases-page">
      <IodCasesToolbar
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        severity={severity}
        onSeverity={setSeverity}
        counts={counts}
        onOpenCase={() => setCreating(true)}
      />
      <div data-list-band className="space-y-9 px-5 py-6 md:px-8">
        {cases.isError ? (
          <p className="text-[13.5px] text-red-700" role="alert">
            Could not load injury cases.{" "}
            <button type="button" className="font-medium underline" onClick={() => void cases.refetch()}>
              Try again
            </button>
          </p>
        ) : null}
        {cases.isLoading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}
        {isEmpty ? (
          <EmptyState
            icon={HardHat}
            title="No injuries on duty"
            description="Open a case when a workplace incident is reported, or start one from the visit workspace."
            action={
              <PrimaryButton type="button" onClick={() => setCreating(true)}>
                Open case
              </PrimaryButton>
            }
            data-testid="oh-iod-cases-empty"
          />
        ) : null}
        {nothingMatches ? (
          <div className="py-8" data-testid="oh-iod-no-matches">
            <p className="text-[15px] font-medium text-brand-navy">No case matches.</p>
            <SecondaryButton
              type="button"
              className="mt-3"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setSeverity("all");
              }}
            >
              Show every case
            </SecondaryButton>
          </div>
        ) : null}
        <div data-testid="oh-iod-cases-list" className="space-y-9">
          <IodCaseGroup title="Open" rows={open} actions={rowActions} />
          <IodCaseGroup
            title="Closed"
            rows={shownClosed}
            actions={rowActions}
            footer={
              closed.length > CLOSED_SHOWN && !showAllClosed ? (
                <button type="button" onClick={() => setShowAllClosed(true)} className="mt-2 text-[13px] font-medium text-brand-primary hover:underline">
                  Show all {closed.length} closed cases
                </button>
              ) : null
            }
          />
        </div>
      </div>
      {creating ? (
        <IodCaseCreateDialog
          onClose={() => setCreating(false)}
          onSaved={async () => {
            await queryClient.invalidateQueries({ queryKey: ["oh-iod-cases"] });
            setCreating(false);
          }}
        />
      ) : null}
    </ListPageLayout>
  );
}
