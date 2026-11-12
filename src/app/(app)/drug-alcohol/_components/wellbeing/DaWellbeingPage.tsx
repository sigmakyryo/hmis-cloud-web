"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton } from "@/components/ui/app-buttons";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { WB_STATUS_LABEL, fetchWbCases, type WbCase } from "@/features/occupational-health/services/wellbeing.service";
import { errorText, fmtDate, label } from "../shared/da-format";
import { DaCell, DaRow } from "../shared/da-ui";
import { WbCaseDrawer } from "./WbCaseDrawer";
import { WbDisciplinePanel } from "./WbDisciplinePanel";
import { WbNewCaseDrawer } from "./WbNewCaseDrawer";
import { WbProvidersPanel } from "./WbProvidersPanel";
import { WbReportPanel } from "./WbReportPanel";

type View = "active" | "closed" | "providers" | "reports" | "discipline";

export function DaWellbeingPage() {
  const [view, setView] = useState<View>("active");
  const [opening, setOpening] = useState(false);
  const [selected, setSelected] = useState<WbCase | null>(null);
  const caseView = view === "active" || view === "closed";
  const cases = useQuery({
    queryKey: ["oh-wb", "cases", view],
    queryFn: () => fetchWbCases(view === "closed" ? "closed" : "active"),
    enabled: caseView,
    retry: false,
  });
  const rows = cases.data?.results ?? [];

  return (
    <ImmPageShell title="Wellbeing" testId="oh-da-wellbeing-page">
      <ImmTabsBar<View>
        label="Wellbeing views"
        tabs={[
          { key: "active", label: "In support", count: view === "active" ? rows.length : undefined },
          { key: "closed", label: "Closed" },
          { key: "providers", label: "Providers" },
          { key: "reports", label: "Reports" },
          { key: "discipline", label: "Disciplinary" },
        ]}
        active={view}
        onChange={setView}
        actions={caseView ? <PageActionButton onClick={() => setOpening(true)}>Someone asked for help</PageActionButton> : null}
      />
      {caseView ? (
        <>
          {cases.isLoading ? <QuietLoading /> : null}
          {cases.isError ? <LoadError>{errorText(cases.error, "Could not load support cases.")}</LoadError> : null}
          {cases.isSuccess && rows.length === 0 ? (
            <EmptyAction
              icon="heartPulse"
              title={view === "active" ? "Nobody in support right now" : "No closed cases"}
              description="A support case opens after a positive result or refusal, or when someone asks for help."
            />
          ) : null}
          {cases.isSuccess && rows.length > 0 ? (
            <ImmRecordTable columns={["Person", "Stage", "Opened", "Return to duty", "Actions"]}>
              {rows.map((c) => (
                <DaRow key={c.uuid} testId="oh-wb-case-row" onClick={() => setSelected(c)}>
                  <DaCell first>
                    <ImmPrimaryCell title={c.customer_initials || "—"} detail={<ImmEmployeeLink uuid={c.customer_uuid} />} />
                  </DaCell>
                  <DaCell>
                    <ImmStatusBadge status={c.in_support ? "open" : "closed"} label={label(WB_STATUS_LABEL, c.status)} />
                  </DaCell>
                  <DaCell>{fmtDate(c.opened_at)}</DaCell>
                  <DaCell>
                    {c.return_to_duty
                      ? `${c.return_to_duty.status.replace(/_/g, " ")} · follow-up ${c.return_to_duty.followups_done}/${c.return_to_duty.followups_required}`
                      : "—"}
                  </DaCell>
                  <DaCell actions>
                    <ImmRowAction onClick={() => setSelected(c)}>Open</ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
      {view === "providers" ? <WbProvidersPanel /> : null}
      {view === "reports" ? <WbReportPanel /> : null}
      {view === "discipline" ? <WbDisciplinePanel /> : null}
      {opening ? <WbNewCaseDrawer onClose={() => setOpening(false)} onOpened={(c) => setSelected(c)} /> : null}
      {selected ? <WbCaseDrawer caseUuid={selected.uuid} onClose={() => setSelected(null)} /> : null}
    </ImmPageShell>
  );
}
