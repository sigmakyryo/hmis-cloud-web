import { Pencil, Plus } from "lucide-react";

import { IodCaseAiNotice } from "@/features/occupational-health/iod-case/components/IodCaseAiNotice";
import { IodFact, IodNarrative, IodSection } from "@/features/occupational-health/iod-case/components/IodCaseFields";
import { IodCaseStillToRecord } from "@/features/occupational-health/iod-case/components/IodCaseStillToRecord";
import type { IodActionId, StillToRecord } from "@/features/occupational-health/iod-case/iod-case.actions";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import { isCaseClosed } from "@/features/occupational-health/iod-case/iod-case.utils";
import { formatOhDate, humanizeOhCode } from "@/features/occupational-health/utils/oh-format";

type IodCaseOverviewTabProps = {
  item: IodCaseDetail;
  todo: StillToRecord[];
  onAction: (action: IodActionId) => void;
  onOpenTab: (tab: "notifications") => void;
};

function Value({ value }: { value: string }) {
  return value.trim() ? <>{value}</> : <span className="text-brand-muted">—</span>;
}

/** The action for one section: it says "Add" while the section is empty and "Edit" once it has something. */
function SectionAction({ filled, label, onClick }: { filled: boolean; label: string; onClick: () => void }) {
  const Icon = filled ? Pencil : Plus;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${filled ? "Edit" : "Add"} ${label}`}
      className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-primary hover:underline"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {filled ? "Edit" : "Add"}
    </button>
  );
}

export function IodCaseOverviewTab({ item, todo, onAction, onOpenTab }: IodCaseOverviewTabProps) {
  const closed = isCaseClosed(item.status);
  const hasResponse = Boolean(item.immediate_action.trim() || item.treatment_given.trim() || item.witnesses.trim());
  const hasOutcome = item.lost_days > 0 || Boolean(item.return_to_work_on);
  const hasReporting = Boolean(item.reported_by.trim() || item.she_reference.trim() || item.claim_reference.trim());

  return (
    <div data-testid="oh-iod-case-overview">
      <IodCaseAiNotice item={item} />
      <IodCaseStillToRecord items={todo} onAction={onAction} onOpenTab={onOpenTab} />
      <div className="divide-y divide-dash-border/80">
        <IodSection title="What happened" action={<SectionAction filled label="what happened" onClick={() => onAction("edit")} />}>
          <IodNarrative label="Description" text={item.description} onAdd={() => onAction("edit")} />
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <IodFact label="Date and time">
              {formatOhDate(item.onset_date)}
              {item.incident_time ? ` · ${item.incident_time}` : ""}
            </IodFact>
            <IodFact label="Location">
              <Value value={item.incident_location} />
            </IodFact>
            <IodFact label="Severity">{humanizeOhCode(item.severity || "minor")}</IodFact>
            <IodFact label="Body part">
              <Value value={item.body_part} />
            </IodFact>
            <IodFact label="Mechanism">
              <Value value={item.mechanism} />
            </IodFact>
            <IodFact label="Work related">{item.work_related ? "Yes" : "No"}</IodFact>
          </dl>
        </IodSection>

        <IodSection
          title="Response and treatment"
          description="What was done at the scene and what care the worker received."
          action={<SectionAction filled={hasResponse} label="response and treatment" onClick={() => onAction("response")} />}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <IodNarrative label="Immediate action" text={item.immediate_action} onAdd={() => onAction("response")} />
            <IodNarrative label="Treatment given" text={item.treatment_given} onAdd={() => onAction("response")} />
          </div>
          <div className="mt-5">
            <IodNarrative label="Witnesses" text={item.witnesses} onAdd={() => onAction("response")} />
          </div>
        </IodSection>

        <IodSection
          title="Cause and prevention"
          description="Why it happened. Track the fixes on the Follow-up tab."
          action={<SectionAction filled={Boolean(item.root_cause.trim())} label="root cause" onClick={() => onAction("cause")} />}
        >
          <IodNarrative label="Root cause" text={item.root_cause} onAdd={() => onAction("cause")} />
        </IodSection>

        <IodSection title="Outcome" action={<SectionAction filled={hasOutcome} label="outcome" onClick={() => onAction("outcome")} />}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <IodFact label="Lost days">{item.lost_days}</IodFact>
            <IodFact label="Returned to work">{formatOhDate(item.return_to_work_on)}</IodFact>
            <IodFact label="Closed">{closed ? formatOhDate(item.closed_on) : "Still open"}</IodFact>
          </dl>
          {closed ? (
            <div className="mt-5">
              <IodNarrative label="How the case ended" text={item.closure_summary} />
            </div>
          ) : null}
        </IodSection>

        <IodSection title="Reporting" action={<SectionAction filled={hasReporting} label="reporting details" onClick={() => onAction("reporting")} />}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            <IodFact label="Reported by">
              <Value value={item.reported_by} />
            </IodFact>
            <IodFact label="Classification">
              {item.safety_classification ? humanizeOhCode(item.safety_classification) : <Value value="" />}
            </IodFact>
            <IodFact label="SHE reference">
              <Value value={item.she_reference} />
            </IodFact>
            <IodFact label="Claim reference">
              <Value value={item.claim_reference} />
            </IodFact>
            <IodFact label="Employer notified">{formatOhDate(item.employer_notified_on)}</IodFact>
            <IodFact label="Authority notified">{formatOhDate(item.authority_notified_on)}</IodFact>
          </dl>
        </IodSection>
      </div>
    </div>
  );
}
