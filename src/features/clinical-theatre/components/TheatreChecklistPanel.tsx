"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useRecordTheatreChecklistStage,
  useTheatreChecklist,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreCaseStatus,
  TheatreChecklistStage,
  TheatreChecklistStageId,
} from "@/features/clinical-theatre/types/clinical-theatre.types";

/** Case statuses in which each WHO stage may be recorded (mirrors the API). */
const RECORDABLE: Record<TheatreChecklistStageId, ReadonlySet<TheatreCaseStatus>> = {
  sign_in: new Set(["waiting", "pre_op"]),
  time_out: new Set(["pre_op", "in_theatre"]),
  sign_out: new Set(["in_theatre", "sign_out"]),
};

const STAGE_HINTS: Record<TheatreChecklistStageId, string> = {
  sign_in: "Before induction of anaesthesia",
  time_out: "Before skin incision",
  sign_out: "Before the patient leaves the operating room",
};

type Drafts = Partial<
  Record<TheatreChecklistStageId, { responses: Record<string, boolean>; notes?: string }>
>;

function isChecked(stage: TheatreChecklistStage, key: string, drafts: Drafts) {
  const draft = drafts[stage.stage]?.responses[key];
  if (draft !== undefined) return draft;
  return stage.items.find((item) => item.key === key)?.checked ?? false;
}

/** WHO Surgical Safety Checklist: sign in, time out, sign out. */
export function TheatreChecklistPanel({
  theatreCase,
  stages: onlyStages,
  title = "WHO surgical safety checklist",
}: {
  theatreCase: TheatreCase;
  /** Limit to these WHO stages (order kept from the API); all when omitted. */
  stages?: readonly TheatreChecklistStageId[];
  /** Heading above the stages; `null` when the surrounding step names it. */
  title?: string | null;
}) {
  const { data: stages = [], isLoading, error } = useTheatreChecklist(theatreCase.uuid);
  const record = useRecordTheatreChecklistStage();
  const [drafts, setDrafts] = useState<Drafts>({});

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading checklist…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Could not load the checklist."}
      </p>
    );
  }

  const toggle = (stage: TheatreChecklistStageId, key: string, value: boolean) =>
    setDrafts((current) => ({
      ...current,
      [stage]: {
        ...current[stage],
        responses: { ...(current[stage]?.responses ?? {}), [key]: value },
      },
    }));

  const setNotes = (stage: TheatreChecklistStageId, notes: string) =>
    setDrafts((current) => ({
      ...current,
      [stage]: { responses: current[stage]?.responses ?? {}, notes },
    }));

  const save = (stage: TheatreChecklistStage, complete: boolean) => {
    const responses = Object.fromEntries(
      stage.items.map((item) => [item.key, isChecked(stage, item.key, drafts)]),
    );
    record.mutate(
      {
        caseUuid: theatreCase.uuid,
        stage: stage.stage,
        payload: {
          responses,
          notes: drafts[stage.stage]?.notes ?? stage.notes,
          complete,
        },
      },
      {
        onSuccess: () =>
          setDrafts((current) => {
            const next = { ...current };
            delete next[stage.stage];
            return next;
          }),
      },
    );
  };

  return (
    <section className="space-y-4" data-testid="theatre-checklist-panel">
      {title ? <h3 className="text-base font-semibold text-brand-navy">{title}</h3> : null}
      {stages.map((stage, index) => {
        if (onlyStages && !onlyStages.includes(stage.stage)) return null;
        const previousDone = index === 0 || stages[index - 1]?.is_complete;
        const editable =
          !stage.is_complete &&
          previousDone &&
          RECORDABLE[stage.stage].has(theatreCase.status);
        const allTicked = stage.items.every((item) =>
          isChecked(stage, item.key, drafts),
        );
        return (
          <div
            key={stage.stage}
            className="space-y-4"
            data-testid={`checklist-stage-${stage.stage}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{stage.label}</p>
                <p className="text-xs text-muted-foreground">
                  {STAGE_HINTS[stage.stage]}
                </p>
              </div>
              <StatusDotBadge tone={stage.is_complete ? "success" : "neutral"}>
                {stage.is_complete
                  ? `Complete${stage.completed_by_name ? ` · ${stage.completed_by_name}` : ""}`
                  : "Not complete"}
              </StatusDotBadge>
            </div>
            <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
              {stage.items.map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-start gap-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0"
                      checked={isChecked(stage, item.key, drafts)}
                      disabled={!editable}
                      onChange={(event) =>
                        toggle(stage.stage, item.key, event.target.checked)
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            {editable ? (
              <>
                <Textarea
                  aria-label={`${stage.label} notes`}
                  placeholder="Notes (optional)"
                  value={drafts[stage.stage]?.notes ?? stage.notes}
                  onChange={(event) => setNotes(stage.stage, event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={record.isPending}
                    onClick={() => save(stage, false)}
                  >
                    Save progress
                  </Button>
                  <Button
                    disabled={!allTicked || record.isPending}
                    onClick={() => save(stage, true)}
                  >
                    Complete {stage.label.toLowerCase()}
                  </Button>
                </div>
              </>
            ) : stage.notes ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {stage.notes}
              </p>
            ) : null}
          </div>
        );
      })}
      {record.error ? (
        <p className="text-sm text-red-600">
          {record.error instanceof Error ? record.error.message : "Could not save."}
        </p>
      ) : null}
    </section>
  );
}
