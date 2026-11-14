"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OhStatusChip } from "@/features/occupational-health/components/OhStatusChip";
import { IodSection } from "@/features/occupational-health/iod-case/components/IodCaseFields";
import {
  addIodCaseEntry,
  deleteIodCaseAction,
  iodCaseKeys,
  patchIodCaseAction,
} from "@/features/occupational-health/iod-case/iod-case.service";
import type { IodCaseEntry } from "@/features/occupational-health/iod-case/iod-case.types";
import { actionState, sortActions, type ActionState } from "@/features/occupational-health/iod-case/iod-case.utils";
import { formatOhDate } from "@/features/occupational-health/utils/oh-format";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

const STATE_CHIP: Record<ActionState, { value: string; label: string } | null> = {
  done: null,
  overdue: { value: "alert", label: "Overdue" },
  due_soon: { value: "watch", label: "Due soon" },
  open: null,
};

function useActionMutations(caseUuid: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const refresh = () => queryClient.invalidateQueries({ queryKey: iodCaseKeys.entries(caseUuid) });
  const onError = (error: unknown) =>
    toast({ variant: "error", title: "Could not save the follow-up", description: error instanceof Error ? error.message : undefined });
  return {
    add: useMutation({
      mutationFn: (input: { body: string; owner_name: string; due_date: string | null }) =>
        addIodCaseEntry(caseUuid, { kind: "action", ...input }),
      onSuccess: refresh,
      onError,
    }),
    toggle: useMutation({
      mutationFn: (input: { uuid: string; completed: boolean }) =>
        patchIodCaseAction(caseUuid, input.uuid, { completed: input.completed }),
      onSuccess: refresh,
      onError,
    }),
    remove: useMutation({
      mutationFn: (uuid: string) => deleteIodCaseAction(caseUuid, uuid),
      onSuccess: refresh,
      onError,
    }),
  };
}

function AddActionForm({ caseUuid, onDone }: { caseUuid: string; onDone: () => void }) {
  const { add } = useActionMutations(caseUuid);
  const [body, setBody] = useState("");
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const valid = body.trim().length >= 2;
  return (
    <form
      className="mb-5 space-y-3 border-l-2 border-brand-primary/40 pl-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        add.mutate({ body: body.trim(), owner_name: owner.trim(), due_date: due || null }, { onSuccess: onDone });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="iod-action-body">What needs to happen?</Label>
        <Textarea id="iod-action-body" rows={2} maxLength={2000} autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Fit a guard to the press and retrain the operators" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="iod-action-owner">Owner</Label>
          <Input id="iod-action-owner" maxLength={120} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Who is responsible" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="iod-action-due">Due date</Label>
          <Input id="iod-action-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <PrimaryButton type="submit" size="sm" disabled={!valid || add.isPending}>
          Add action
        </PrimaryButton>
        <SecondaryButton type="button" size="sm" onClick={onDone}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}

function ActionRow({ entry, caseUuid, today }: { entry: IodCaseEntry; caseUuid: string; today: Date }) {
  const { toggle, remove } = useActionMutations(caseUuid);
  const [confirming, setConfirming] = useState(false);
  const done = Boolean(entry.completed_on);
  const chip = STATE_CHIP[actionState(entry, today)];
  return (
    <li className="flex items-start gap-3 py-3" data-testid="oh-iod-action">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reopen: ${entry.body}` : `Mark done: ${entry.body}`}
        disabled={toggle.isPending}
        onClick={() => toggle.mutate({ uuid: entry.uuid, completed: !done })}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          done ? "border-brand-primary bg-brand-primary text-white" : "border-dash-border bg-white hover:border-brand-primary",
        )}
      >
        {done ? <Check className="size-3.5" aria-hidden="true" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("whitespace-pre-wrap text-sm", done ? "text-brand-muted line-through" : "text-brand-navy")}>{entry.body}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-muted">
          {entry.owner_name ? <span>{entry.owner_name}</span> : <span>No owner</span>}
          <span aria-hidden="true">·</span>
          {done ? <span>Done {formatOhDate(entry.completed_on)}</span> : <span>{entry.due_date ? `Due ${formatOhDate(entry.due_date)}` : "No due date"}</span>}
          {chip ? <OhStatusChip value={chip.value} label={chip.label} /> : null}
        </p>
      </div>
      {confirming ? (
        <span className="flex shrink-0 items-center gap-2 text-xs">
          <button type="button" className="font-medium text-red-700 hover:underline" disabled={remove.isPending} onClick={() => remove.mutate(entry.uuid)}>
            Remove
          </button>
          <button type="button" className="text-brand-muted hover:underline" onClick={() => setConfirming(false)}>
            Keep
          </button>
        </span>
      ) : (
        <button type="button" aria-label={`Remove action: ${entry.body}`} onClick={() => setConfirming(true)} className="shrink-0 rounded p-1 text-brand-muted hover:bg-dash-canvas hover:text-red-700">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

type IodCaseFollowUpTabProps = { caseUuid: string; entries: readonly IodCaseEntry[]; today: Date };

export function IodCaseFollowUpTab({ caseUuid, entries, today }: IodCaseFollowUpTabProps) {
  const [adding, setAdding] = useState(false);
  const actions = sortActions(entries.filter((entry) => entry.kind === "action"));
  return (
    <IodSection
      title="Follow-up actions"
      description="Corrective and preventive steps that come out of this incident."
      action={
        adding ? null : (
          <SecondaryButton type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" aria-hidden="true" /> Add action
          </SecondaryButton>
        )
      }
      className="pt-0"
    >
      <div data-testid="oh-iod-case-followups">
        {adding ? <AddActionForm caseUuid={caseUuid} onDone={() => setAdding(false)} /> : null}
        {actions.length === 0 && !adding ? (
          <p className="py-6 text-sm text-brand-muted">No follow-up actions yet. Add the fixes that stop this happening again.</p>
        ) : (
          <ul className="divide-y divide-dash-border/60">
            {actions.map((entry) => (
              <ActionRow key={entry.uuid} entry={entry} caseUuid={caseUuid} today={today} />
            ))}
          </ul>
        )}
      </div>
    </IodSection>
  );
}
