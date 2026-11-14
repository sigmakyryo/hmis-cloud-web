import { IodFact, IodNarrative, IodSection } from "@/features/occupational-health/iod-case/components/IodCaseFields";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import { isCaseClosed } from "@/features/occupational-health/iod-case/iod-case.utils";
import { formatOhDate, humanizeOhCode } from "@/features/occupational-health/utils/oh-format";

type IodCaseOverviewTabProps = { item: IodCaseDetail; onEdit: () => void };

function Value({ value }: { value: string }) {
  return value.trim() ? <>{value}</> : <span className="text-brand-muted">—</span>;
}

export function IodCaseOverviewTab({ item, onEdit }: IodCaseOverviewTabProps) {
  const closed = isCaseClosed(item.status);

  return (
    <div className="divide-y divide-dash-border/80" data-testid="oh-iod-case-overview">
      <IodSection title="What happened">
        <IodNarrative label="Description" text={item.description} onAdd={onEdit} />
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
          <IodFact label="Date and time">
            {formatOhDate(item.onset_date)}
            {item.incident_time ? ` · ${item.incident_time}` : ""}
          </IodFact>
          <IodFact label="Location">
            <Value value={item.incident_location} />
          </IodFact>
          <IodFact label="Reported by">
            <Value value={item.reported_by} />
          </IodFact>
          <IodFact label="Mechanism">
            <Value value={item.mechanism} />
          </IodFact>
          <IodFact label="Body part">
            <Value value={item.body_part} />
          </IodFact>
          <IodFact label="Classification">
            {item.safety_classification ? humanizeOhCode(item.safety_classification) : <Value value="" />}
          </IodFact>
        </dl>
      </IodSection>

      <IodSection title="Response and treatment" description="What was done at the scene and what care the worker received.">
        <div className="grid gap-5 md:grid-cols-2">
          <IodNarrative label="Immediate action" text={item.immediate_action} onAdd={onEdit} />
          <IodNarrative label="Treatment given" text={item.treatment_given} onAdd={onEdit} />
        </div>
        <div className="mt-5">
          <IodNarrative label="Witnesses" text={item.witnesses} onAdd={onEdit} />
        </div>
      </IodSection>

      <IodSection title="Cause and prevention" description="Why it happened. Track the fixes on the Follow-up tab.">
        <IodNarrative label="Root cause" text={item.root_cause} onAdd={onEdit} />
      </IodSection>

      <IodSection title="Outcome">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
          <IodFact label="Lost days">{item.lost_days}</IodFact>
          <IodFact label="Returned to work">{formatOhDate(item.return_to_work_on)}</IodFact>
          <IodFact label="Closed">{closed ? formatOhDate(item.closed_on) : "Still open"}</IodFact>
        </dl>
        {closed ? (
          <div className="mt-5">
            <IodNarrative label="How the case ended" text={item.closure_summary} onAdd={onEdit} />
          </div>
        ) : null}
      </IodSection>
    </div>
  );
}
