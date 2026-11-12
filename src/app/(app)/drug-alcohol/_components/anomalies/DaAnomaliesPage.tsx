"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  ANOMALY_METRIC_LABEL,
  decideDaAnomaly,
  fetchDaAnomalies,
  pct,
  scanDaAnomalies,
  type DaAnomaly,
} from "@/features/occupational-health/services/drug-alcohol-risk.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDate, fmtDateTime, isForbidden, label } from "../shared/da-format";
import { DaCell, DaFact, DaRow, DaSection } from "../shared/da-ui";

type View = DaAnomaly["status"];

const who = (a: DaAnomaly) => (a.dimension === "collector" ? `Collector ${a.subject}` : `Site: ${a.subject}`);

export function DaAnomaliesPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [view, setView] = useState<View>("open");
  const [selected, setSelected] = useState<DaAnomaly | null>(null);
  const query = useQuery({ queryKey: ["oh-da", "anomalies", view], queryFn: () => fetchDaAnomalies(view), retry: false });
  const scan = useMutation({
    mutationFn: () => scanDaAnomalies(6),
    onSuccess: (r) => {
      toast({ variant: "success", title: "Check finished", description: r.created ? `${r.created} new pattern(s) to look at.` : "Nothing new found." });
      void client.invalidateQueries({ queryKey: ["oh-da", "anomalies"] });
    },
    onError: (error) => toast({ variant: "error", title: "Check failed", description: errorText(error) }),
  });
  const rows = query.data ?? [];

  return (
    <ImmPageShell title="Unusual patterns" testId="oh-da-anomalies-page">
      <ImmTabsBar<View>
        label="Unusual pattern views"
        tabs={[
          { key: "open", label: "To look at", count: view === "open" ? rows.length : undefined },
          { key: "reviewed", label: "Reviewed" },
          { key: "dismissed", label: "Dismissed" },
        ]}
        active={view}
        onChange={setView}
        actions={
          <PageActionButton disabled={scan.isPending} onClick={() => scan.mutate()}>
            Check last 6 months
          </PageActionButton>
        }
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? (
        <LoadError>
          {isForbidden(query.error)
            ? "Only an administrator or the medical review officer can see unusual patterns."
            : errorText(query.error, "Could not load unusual patterns.")}
        </LoadError>
      ) : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction
          icon="flask"
          title={view === "open" ? "Nothing unusual" : "Nothing here"}
          description="Collectors and sites whose dilute, invalid, refusal, late or out-of-hours rates stand out from everyone else show here."
        />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Who", "What", "Their rate", "Everyone else", "Found", "Actions"]}>
          {rows.map((a) => (
            <DaRow key={a.uuid} testId="oh-da-anomaly-row" onClick={() => setSelected(a)}>
              <DaCell first>
                <ImmPrimaryCell title={who(a)} detail={`${a.total} tests`} />
              </DaCell>
              <DaCell>{label(ANOMALY_METRIC_LABEL, a.metric)}</DaCell>
              <DaCell>{`${pct(a.rate)} (${a.events} of ${a.total})`}</DaCell>
              <DaCell>{pct(a.baseline_rate)}</DaCell>
              <DaCell>{fmtDate(a.detected_at)}</DaCell>
              <DaCell actions>
                {a.status === "open" ? <ImmRowAction onClick={() => setSelected(a)}>Look at</ImmRowAction> : <ImmStatusBadge status="closed" label={a.status} />}
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {selected ? <AnomalyDrawer anomaly={selected} onClose={() => setSelected(null)} /> : null}
    </ImmPageShell>
  );
}

function AnomalyDrawer({ anomaly, onClose }: { anomaly: DaAnomaly; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [note, setNote] = useState(anomaly.review_note);
  const decide = useMutation({
    mutationFn: (action: "review" | "dismiss") => {
      if (!note.trim()) throw new Error("Add a short note first.");
      return decideDaAnomaly(anomaly.uuid, action, note);
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Saved" });
      void client.invalidateQueries({ queryKey: ["oh-da", "anomalies"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  return (
    <Drawer title={`${who(anomaly)} · ${label(ANOMALY_METRIC_LABEL, anomaly.metric)}`} description="Compared with all other collectors or sites" onClose={onClose}>
      <div className="space-y-4" data-testid="oh-da-anomaly-sheet">
        <DaSection title="What stands out">
          <DaFact label="Their rate">{`${pct(anomaly.rate)} (${anomaly.events} of ${anomaly.total} tests)`}</DaFact>
          <DaFact label="Everyone else">{pct(anomaly.baseline_rate)}</DaFact>
          <DaFact label="How unusual">{`${anomaly.z_score.toFixed(1)} standard deviations · chance ${anomaly.p_value < 0.0001 ? "under 0.01%" : pct(anomaly.p_value)}`}</DaFact>
          <DaFact label="Period">{`${fmtDate(anomaly.window_from)} – ${fmtDate(anomaly.window_to)}`}</DaFact>
          {anomaly.reviewed_at ? <DaFact label="Decided">{`${anomaly.reviewed_by_initials} · ${fmtDateTime(anomaly.reviewed_at)}`}</DaFact> : null}
        </DaSection>
        <label className="block space-y-1.5 text-[13px]">
          <span className="text-dash-muted">Note</span>
          <textarea
            aria-label="Review note"
            className="min-h-20 w-full rounded-md border border-dash-border px-3 py-2 text-[13px]"
            value={note}
            disabled={anomaly.status !== "open"}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {anomaly.status === "open" ? (
          <DrawerActions>
            <SecondaryButton disabled={decide.isPending} onClick={() => decide.mutate("dismiss")}>
              Dismiss
            </SecondaryButton>
            <PageActionButton disabled={decide.isPending} onClick={() => decide.mutate("review")}>
              Mark reviewed
            </PageActionButton>
          </DrawerActions>
        ) : null}
      </div>
    </Drawer>
  );
}
