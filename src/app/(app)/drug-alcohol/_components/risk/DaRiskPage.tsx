"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton, PageActionButton } from "@/components/ui/app-buttons";
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
import { fetchDaDraws, type DaDraw } from "@/features/occupational-health/services/drug-alcohol.service";
import {
  DRAW_CHECK_LABEL,
  decideDaRateProposal,
  fetchDaRateProposals,
  fetchDaRiskPools,
  proposeDaRates,
  verifyDaDraw,
  type DaDrawCheck,
  type DaRateProposal,
  type DaRiskPool,
} from "@/features/occupational-health/services/drug-alcohol-risk.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDateTime, isForbidden } from "../shared/da-format";
import { DaCell, DaFact, DaRow, DaSection } from "../shared/da-ui";
import { DaRiskSettingsDrawer } from "./DaRiskSettingsDrawer";

type View = "pools" | "waiting" | "history" | "draws";

const rates = (drug: number, alcohol: number) => `Drugs ${drug}% · Alcohol ${alcohol}%`;

export function DaRiskPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [view, setView] = useState<View>("pools");
  const [editing, setEditing] = useState<DaRiskPool | null>(null);
  const [deciding, setDeciding] = useState<DaRateProposal | null>(null);
  const pools = useQuery({ queryKey: ["oh-da", "risk", "pools"], queryFn: fetchDaRiskPools, retry: false });
  const waiting = useQuery({ queryKey: ["oh-da", "risk", "proposals", "proposed"], queryFn: () => fetchDaRateProposals("proposed"), retry: false });
  const history = useQuery({
    queryKey: ["oh-da", "risk", "proposals", "all"],
    queryFn: () => fetchDaRateProposals(),
    enabled: view === "history",
    retry: false,
  });

  const propose = useMutation({
    mutationFn: (pool: DaRiskPool) => proposeDaRates(pool.uuid),
    onSuccess: (result) => {
      if ("proposal" in result && result.proposal === null) {
        toast({ variant: "success", title: "No change needed", description: result.message });
      } else {
        toast({ variant: "success", title: "New rates proposed", description: "They apply once approved." });
        setView("waiting");
      }
      void client.invalidateQueries({ queryKey: ["oh-da", "risk"] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not propose", description: errorText(error) }),
  });

  const forbidden = isForbidden(pools.error);

  return (
    <ImmPageShell title="Risk and rates" testId="oh-da-risk-page">
      <ImmTabsBar<View>
        label="Risk and rates views"
        tabs={[
          { key: "pools", label: "Pools", count: pools.data?.length },
          { key: "waiting", label: "Waiting for approval", count: waiting.data?.length },
          { key: "history", label: "Decisions" },
          { key: "draws", label: "Check a draw" },
        ]}
        active={view}
        onChange={setView}
      />
      {forbidden ? <LoadError>Only an administrator or the medical review officer can manage testing rates.</LoadError> : null}

      {!forbidden && view === "pools" ? (
        <>
          {pools.isLoading ? <QuietLoading /> : null}
          {pools.isError ? <LoadError>{errorText(pools.error, "Could not load pools.")}</LoadError> : null}
          {pools.isSuccess && pools.data.length === 0 ? (
            <EmptyAction icon="flask" title="No random pools yet" description="Create a pool under Random pools first." />
          ) : null}
          {pools.isSuccess && pools.data.length > 0 ? (
            <ImmRecordTable columns={["Pool", "Yearly rate now", "Risk-based rates", "Allowed range", "Pending change", "Actions"]}>
              {pools.data.map((p) => (
                <DaRow key={p.uuid} testId="oh-da-risk-pool-row">
                  <DaCell first>
                    <ImmPrimaryCell title={p.name} detail={p.frequency} />
                  </DaCell>
                  <DaCell>{rates(p.annual_drug_rate, p.annual_alcohol_rate)}</DaCell>
                  <DaCell>
                    <ImmStatusBadge
                      status={p.risk.enabled ? "open" : "closed"}
                      label={p.risk.enabled ? (p.risk.weighted_draw ? "On, weighted picks" : "On") : "Off"}
                    />
                  </DaCell>
                  <DaCell>
                    Drugs {p.risk.min_drug_rate}–{p.risk.max_drug_rate}% · Alcohol {p.risk.min_alcohol_rate}–{p.risk.max_alcohol_rate}%
                  </DaCell>
                  <DaCell>
                    {p.latest_proposal?.status === "proposed"
                      ? rates(p.latest_proposal.proposed_drug_rate, p.latest_proposal.proposed_alcohol_rate)
                      : "None"}
                  </DaCell>
                  <DaCell actions>
                    <ImmRowAction onClick={() => setEditing(p)}>Settings</ImmRowAction>
                    <ImmRowAction disabled={!p.risk.enabled || propose.isPending} onClick={() => propose.mutate(p)}>
                      Work out rates
                    </ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}

      {!forbidden && (view === "waiting" || view === "history") ? (
        <ProposalTable
          query={view === "waiting" ? waiting : history}
          emptyTitle={view === "waiting" ? "Nothing waiting" : "No decisions yet"}
          onDecide={view === "waiting" ? setDeciding : undefined}
        />
      ) : null}

      {!forbidden && view === "draws" ? <DrawChecks /> : null}

      {editing ? <DaRiskSettingsDrawer pool={editing} onClose={() => setEditing(null)} /> : null}
      {deciding ? <DecideDrawer proposal={deciding} onClose={() => setDeciding(null)} /> : null}
    </ImmPageShell>
  );
}

function ProposalTable({
  query,
  emptyTitle,
  onDecide,
}: {
  query: { isLoading: boolean; isError: boolean; isSuccess: boolean; error: unknown; data?: DaRateProposal[] };
  emptyTitle: string;
  onDecide?: (p: DaRateProposal) => void;
}) {
  const rows = query.data ?? [];
  return (
    <>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load rate changes.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction icon="flask" title={emptyTitle} description="Proposed rate changes need approval before they apply." />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Pool", "Now", "Proposed", "Why", "Status", "Actions"]}>
          {rows.map((p) => (
            <DaRow key={p.uuid} testId="oh-da-proposal-row" onClick={onDecide ? () => onDecide(p) : undefined}>
              <DaCell first>
                <ImmPrimaryCell title={p.pool_name ?? "—"} detail={fmtDateTime(p.proposed_at)} />
              </DaCell>
              <DaCell>{rates(p.current_drug_rate, p.current_alcohol_rate)}</DaCell>
              <DaCell>{rates(p.proposed_drug_rate, p.proposed_alcohol_rate)}</DaCell>
              <DaCell>{basisText(p)}</DaCell>
              <DaCell>
                <ImmStatusBadge status={p.status === "approved" ? "completed" : p.status === "proposed" ? "pending" : "closed"} label={p.status} />
              </DaCell>
              <DaCell actions>{onDecide ? <ImmRowAction onClick={() => onDecide(p)}>Decide</ImmRowAction> : p.decided_by_initials || "—"}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
    </>
  );
}

function basisText(p: DaRateProposal): string {
  const b = p.basis ?? {};
  const parts = [`average risk ×${b.mean_weight ?? 1}`];
  if (b.incidents) parts.push(`${b.incidents} incident${b.incidents === 1 ? "" : "s"} in ${b.lookback_months ?? 12} months`);
  if (b.tier_counts?.["3"]) parts.push(`${b.tier_counts["3"]} high-risk`);
  return parts.join(" · ");
}

function DecideDrawer({ proposal, onClose }: { proposal: DaRateProposal; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: (decision: "approve" | "reject") => decideDaRateProposal(proposal.uuid, decision, note),
    onSuccess: (next) => {
      toast({ variant: "success", title: next.status === "approved" ? "New rates applied" : "Change rejected" });
      void client.invalidateQueries({ queryKey: ["oh-da"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const b = proposal.basis ?? {};
  return (
    <Drawer title={`Rate change for ${proposal.pool_name ?? "pool"}`} description="Approving changes the yearly testing rate" onClose={onClose}>
      <div className="space-y-4" data-testid="oh-da-proposal-sheet">
        <DaSection title="Change">
          <DaFact label="Drugs">{`${proposal.current_drug_rate}% → ${proposal.proposed_drug_rate}%`}</DaFact>
          <DaFact label="Alcohol">{`${proposal.current_alcohol_rate}% → ${proposal.proposed_alcohol_rate}%`}</DaFact>
        </DaSection>
        <DaSection title="Why">
          <DaFact label="Workers in pool">{b.population ?? "—"}</DaFact>
          <DaFact label="Average risk">{`×${b.mean_weight ?? 1}`}</DaFact>
          <DaFact label="High / medium / standard risk">{`${b.tier_counts?.["3"] ?? 0} / ${b.tier_counts?.["2"] ?? 0} / ${b.tier_counts?.["1"] ?? 0}`}</DaFact>
          <DaFact label="Incidents">{`${b.incidents ?? 0} (last ${b.lookback_months ?? 12} months)`}</DaFact>
        </DaSection>
        <label className="block space-y-1.5 text-[13px]">
          <span className="text-dash-muted">Note (needed to reject)</span>
          <textarea
            aria-label="Decision note"
            className="min-h-20 w-full rounded-md border border-dash-border px-3 py-2 text-[13px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <DrawerActions>
          <SecondaryButton disabled={decide.isPending} onClick={() => decide.mutate("reject")}>
            Reject
          </SecondaryButton>
          <PageActionButton disabled={decide.isPending} onClick={() => decide.mutate("approve")}>
            Approve
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}

function DrawChecks() {
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, DaDrawCheck>>({});
  const draws = useQuery({ queryKey: ["oh-da", "draws"], queryFn: () => fetchDaDraws() });
  const check = useMutation({
    mutationFn: (d: DaDraw) => verifyDaDraw(d.uuid),
    onSuccess: (r) => setResults((prev) => ({ ...prev, [r.draw_uuid]: r })),
    onError: (error) => toast({ variant: "error", title: "Could not check the draw", description: errorText(error) }),
  });
  const rows = draws.data ?? [];
  return (
    <>
      {draws.isLoading ? <QuietLoading /> : null}
      {draws.isError ? <LoadError>{errorText(draws.error, "Could not load draws.")}</LoadError> : null}
      {draws.isSuccess && rows.length === 0 ? <EmptyAction icon="flask" title="No draws yet" description="Draws can be re-checked here." /> : null}
      {draws.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Draw", "Method", "Result", "Actions"]}>
          {rows.map((d) => {
            const r = results[d.uuid];
            return (
              <DaRow key={d.uuid} testId="oh-da-draw-check-row">
                <DaCell first>
                  <ImmPrimaryCell title={d.period_label} detail={d.pool_name} />
                </DaCell>
                <DaCell>{d.algorithm.includes("weighted") ? "Risk-weighted" : "Equal chance"}</DaCell>
                <DaCell>
                  {r ? (
                    <span title={Object.entries(r.checks).map(([k, v]) => `${DRAW_CHECK_LABEL[k] ?? k}: ${v ? "yes" : "no"}`).join("\n")}>
                      <ImmStatusBadge status={r.ok ? "completed" : "overdue"} label={r.ok ? "Checks out" : "Does not match"} />
                    </span>
                  ) : (
                    "Not checked"
                  )}
                </DaCell>
                <DaCell actions>
                  <ImmRowAction disabled={check.isPending} onClick={() => check.mutate(d)}>
                    Check
                  </ImmRowAction>
                </DaCell>
              </DaRow>
            );
          })}
        </ImmRecordTable>
      ) : null}
    </>
  );
}
