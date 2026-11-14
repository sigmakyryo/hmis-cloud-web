import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import { humanizeOhCode } from "@/features/occupational-health/utils/oh-format";

/**
 * Says where the AI write-up stands, so a clinician knows what to check. Nothing here is shown for a case
 * that was not recorded from a visit.
 */
export function IodCaseAiNotice({ item }: { item: IodCaseDetail }) {
  if (!item.source_encounter_uuid) return null;

  const drafted = item.ai_drafted_fields.map((field) => humanizeOhCode(field).toLowerCase());

  if (item.ai_status === "documented" && drafted.length > 0) {
    return (
      <Notice title="Drafted by AI from the visit record" testId="oh-iod-ai-notice">
        Please review and correct it before relying on it. Drafted: {drafted.join(", ")}.
      </Notice>
    );
  }
  if (item.ai_status === "waiting" || item.ai_status === "") {
    return (
      <Notice title="Waiting for the visit to be documented" testId="oh-iod-ai-notice">
        Once the visit has a complaint, notes or findings, this case is filled in automatically. You can also edit
        it yourself at any time.
      </Notice>
    );
  }
  if (item.ai_status === "needs_input") {
    return (
      <Notice title="The visit record doesn’t describe the incident yet" testId="oh-iod-ai-notice">
        Add what happened on the visit, then use Draft from visit record, or complete the case yourself.
      </Notice>
    );
  }
  if (item.ai_status === "failed") {
    return (
      <Notice title="The case could not be drafted automatically" testId="oh-iod-ai-notice">
        It will be tried again. You can complete it yourself or use Draft from visit record.
      </Notice>
    );
  }
  return null;
}

function Notice({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 border-l-2 border-brand-primary/50 py-0.5 pl-4" role="status" data-testid={testId}>
      <p className="text-sm font-semibold text-brand-navy">{title}</p>
      <p className="mt-0.5 text-[13px] text-brand-muted">{children}</p>
    </div>
  );
}
