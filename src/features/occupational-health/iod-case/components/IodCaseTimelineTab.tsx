"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IodSection } from "@/features/occupational-health/iod-case/components/IodCaseFields";
import { addIodCaseEntry, iodCaseKeys } from "@/features/occupational-health/iod-case/iod-case.service";
import type { IodCaseEntry } from "@/features/occupational-health/iod-case/iod-case.types";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

const stamp = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function formatStamp(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : stamp.format(date);
}

function Composer({ caseUuid }: { caseUuid: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const post = useMutation({
    mutationFn: () => addIodCaseEntry(caseUuid, { kind: "note", body: body.trim() }),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: iodCaseKeys.entries(caseUuid) });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not add the note", description: error instanceof Error ? error.message : undefined }),
  });
  const valid = body.trim().length >= 2;
  return (
    <form
      className="mb-6 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) post.mutate();
      }}
    >
      <Label htmlFor="iod-note" className="sr-only">
        Add a note
      </Label>
      <Textarea
        id="iod-note"
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && valid) post.mutate();
        }}
        placeholder="Add a note: a call with the worker, a site visit, an update from the employer…"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-brand-muted">Notes can’t be edited once posted.</p>
        <PrimaryButton type="submit" size="sm" disabled={!valid || post.isPending}>
          {post.isPending ? "Posting…" : "Post note"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function entryHeadline(entry: IodCaseEntry): string {
  if (entry.kind === "note") return entry.author_name ? `${entry.author_name} added a note` : "Note added";
  if (entry.kind === "action") return "Follow-up action added";
  return entry.body;
}

type IodCaseTimelineTabProps = { caseUuid: string; entries: readonly IodCaseEntry[]; isLoading: boolean };

export function IodCaseTimelineTab({ caseUuid, entries, isLoading }: IodCaseTimelineTabProps) {
  return (
    <IodSection title="Timeline" description="Everything that has happened on this case, newest first." className="pt-0">
      <div data-testid="oh-iod-case-timeline">
        <Composer caseUuid={caseUuid} />
        {isLoading ? <p className="text-sm text-brand-muted">Loading timeline…</p> : null}
        <ol className="relative space-y-5 border-l border-dash-border/80 pl-5">
          {entries.map((entry) => (
            <li key={entry.uuid} className="relative" data-testid="oh-iod-timeline-entry">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[25px] top-1.5 size-2 rounded-full ring-4 ring-white",
                  entry.kind === "event" ? "bg-dash-border" : "bg-brand-primary",
                )}
              />
              <p className={cn("text-[13px]", entry.kind === "event" ? "text-brand-muted" : "font-medium text-brand-navy")}>
                {entryHeadline(entry)}
              </p>
              {entry.kind !== "event" ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-brand-navy">{entry.body}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-brand-muted">
                {formatStamp(entry.created_at)}
                {entry.kind === "event" && entry.author_name ? ` · ${entry.author_name}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </IodSection>
  );
}
