"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  fetchDaRtdCases,
  recordDaSapStep,
  type DaRtdCase,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDate, fmtDateTime, label } from "../shared/da-format";
import { DaCell, DaFact, DaRow, DaSection } from "../shared/da-ui";

const RTD_STATUS: Record<string, string> = {
  referred: "Waiting for counsellor",
  in_treatment: "In treatment",
  rtd_test_pending: "Return-to-duty test due",
  follow_up: "Follow-up testing",
  completed: "Finished",
  closed: "Closed",
  failed: "Failed",
};

type View = "open" | "all";

export function DaRtdPage() {
  const [view, setView] = useState<View>("open");
  const [selected, setSelected] = useState<DaRtdCase | null>(null);
  const query = useQuery({ queryKey: ["oh-da", "rtd"], queryFn: () => fetchDaRtdCases() });
  const all = query.data ?? [];
  const rows = view === "open" ? all.filter((c) => !["completed", "closed", "failed"].includes(c.status)) : all;

  return (
    <ImmPageShell title="Return to duty" testId="oh-da-rtd-page">
      <ImmTabsBar<View>
        label="Return to duty views"
        tabs={[
          { key: "open", label: "Open", count: all.filter((c) => !["completed", "closed", "failed"].includes(c.status)).length },
          { key: "all", label: "All", count: all.length },
        ]}
        active={view}
        onChange={setView}
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load return-to-duty cases.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction
          icon="flask"
          title="No return-to-duty cases"
          description="A case opens automatically after a verified positive or refusal for safety-critical work."
        />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Worker", "Opened", "Counsellor", "Follow-ups", "Stage", "Actions"]}>
          {rows.map((c) => (
            <DaRow key={c.uuid} testId="oh-da-rtd-row" onClick={() => setSelected(c)}>
              <DaCell first>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-navy">{c.customer_initials || "—"}</span>
                  <ImmEmployeeLink uuid={c.customer_uuid} />
                </div>
              </DaCell>
              <DaCell>{fmtDate(c.referred_at)}</DaCell>
              <DaCell>{c.sap_name || "—"}</DaCell>
              <DaCell>
                {c.followups_done ?? c.followups.filter((f) => f.status === "done").length} of {c.followup_tests_required}
              </DaCell>
              <DaCell>
                <ImmStatusBadge status={c.status} label={label(RTD_STATUS, c.status)} />
              </DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setSelected(c)}>Open</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {selected ? <RtdSheet item={selected} onClose={() => setSelected(null)} /> : null}
    </ImmPageShell>
  );
}

function RtdSheet({ item, onClose }: { item: DaRtdCase; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [current, setCurrent] = useState(item);
  const [sap, setSap] = useState(item.sap_name ?? "");
  const [recommendation, setRecommendation] = useState(item.recommendation ?? "");
  const [tests, setTests] = useState(String(item.followup_tests_required || 6));
  const [months, setMonths] = useState(String(item.followup_months || 12));
  const [notes, setNotes] = useState("");
  const step = useMutation({
    mutationFn: (action: "assess" | "clear" | "note") =>
      recordDaSapStep(current.uuid, {
        action,
        sap_name: sap || undefined,
        recommendation: recommendation || undefined,
        followup_tests: action === "clear" ? Number(tests) : undefined,
        followup_months: action === "clear" ? Number(months) : undefined,
        notes: notes || undefined,
      }),
    onSuccess: (next) => {
      setCurrent(next);
      setNotes("");
      toast({ variant: "success", title: "Saved" });
      void client.invalidateQueries({ queryKey: ["oh-da"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const canAssess = current.status === "referred";
  const canClear = current.status === "in_treatment";

  return (
    <Drawer title="Return to duty" description={`Worker ${current.customer_initials || ""}`} onClose={onClose} wide>
      <DaSection title="Steps">
        <DaFact label="1. Referred">{fmtDateTime(current.referred_at)}</DaFact>
        <DaFact label="2. Counsellor assessment">{fmtDateTime(current.assessed_at)}</DaFact>
        <DaFact label="3. Counsellor clearance">{fmtDateTime(current.sap_cleared_at)}</DaFact>
        <DaFact label="4. Return-to-duty test passed">{fmtDateTime(current.rtd_passed_at)}</DaFact>
        <DaFact label="5. Follow-up tests">
          {current.followup_tests_required} over {current.followup_months} months{current.followup_observed ? ", observed" : ""}
        </DaFact>
      </DaSection>
      {current.followups.length > 0 ? (
        <DaSection title="Follow-up plan">
          {current.followups.map((f) => (
            <DaFact key={f.uuid} label={`Test ${f.sequence}`}>
              {fmtDate(f.due_date)} · <ImmStatusBadge status={f.status} />
            </DaFact>
          ))}
        </DaSection>
      ) : null}
      {canAssess || canClear ? (
        <DaSection title={canAssess ? "Record assessment" : "Record clearance"}>
          <div className="space-y-2">
            <Field label="Counsellor (SAP) name" value={sap} onChange={setSap} required />
            <Field label="Recommendation" value={recommendation} onChange={setRecommendation} />
            {canClear ? (
              <>
                <Field label="Follow-up tests (at least 6)" type="number" value={tests} onChange={setTests} />
                <Field label="Over how many months" type="number" value={months} onChange={setMonths} />
              </>
            ) : null}
          </div>
        </DaSection>
      ) : null}
      <Field label="Add a note" value={notes} onChange={setNotes} />
      <DrawerActions>
        <SecondaryButton disabled={!notes.trim() || step.isPending} onClick={() => step.mutate("note")}>
          Save note
        </SecondaryButton>
        {canAssess ? (
          <PageActionButton disabled={!sap.trim() || step.isPending} onClick={() => step.mutate("assess")}>
            Assessment done
          </PageActionButton>
        ) : null}
        {canClear ? (
          <PageActionButton disabled={!sap.trim() || step.isPending} onClick={() => step.mutate("clear")}>
            Cleared for return test
          </PageActionButton>
        ) : null}
      </DrawerActions>
    </Drawer>
  );
}
