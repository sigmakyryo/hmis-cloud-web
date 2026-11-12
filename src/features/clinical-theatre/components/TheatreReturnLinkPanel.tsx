"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useTheatreCases,
  useUpdateTheatreCaseDetails,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreCaseReturnLink,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  linkedCaseHref,
  returnCandidates,
  returnLinkLabel,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";

function LinkedCase({ link, label }: { link: TheatreCaseReturnLink; label: string }) {
  const href = linkedCaseHref(link);
  const name = link.procedure_description || "Theatre case";
  return (
    <li className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {href ? (
        <Link className="font-medium text-brand-navy underline" href={href}>
          {name}
        </Link>
      ) : (
        <span className="font-medium">{name}</span>
      )}{" "}
      <span className="text-xs text-muted-foreground">({link.status_label})</span>
      {link.return_reason ? (
        <span className="block text-xs text-muted-foreground">Reason: {link.return_reason}</span>
      ) : null}
    </li>
  );
}

/** Return-to-theatre links: the original case this one re-operates on, and any returns. */
export function TheatreReturnLinkPanel({
  theatreCase,
  canEdit,
}: {
  theatreCase: TheatreCase;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [original, setOriginal] = useState("");
  const [reason, setReason] = useState("");
  const [planned, setPlanned] = useState<"planned" | "unplanned">("unplanned");
  const update = useUpdateTheatreCaseDetails();
  const patientCases = useTheatreCases(
    { customer: theatreCase.customer_uuid },
    { enabled: editing },
  );
  const candidates = returnCandidates(theatreCase, patientCases.data ?? []);
  const closed = ["discharged_ward", "discharged_home", "cancelled"].includes(
    theatreCase.status,
  );
  const returns = theatreCase.returns ?? [];

  return (
    <div className="space-y-2" data-testid="theatre-return-panel">
      {theatreCase.return_of ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-rose-800">
            {returnLinkLabel(theatreCase.return_planned, theatreCase.return_interval_days)}
          </p>
          <ul>
            <LinkedCase
              link={{ ...theatreCase.return_of, return_reason: theatreCase.return_reason }}
              label="Return to theatre for"
            />
          </ul>
          {canEdit && !closed ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-2 text-xs"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ uuid: theatreCase.uuid, payload: { return_of: null } })
              }
            >
              Remove link
            </Button>
          ) : null}
        </div>
      ) : null}
      {returns.length > 0 ? (
        <ul className="space-y-1">
          {returns.map((link) => (
            <LinkedCase
              key={link.uuid}
              link={link}
              label={link.return_planned ? "Planned return" : "Returned to theatre"}
            />
          ))}
        </ul>
      ) : null}
      {!theatreCase.return_of && returns.length === 0 && !editing ? (
        <p className="text-sm text-muted-foreground">Not linked to another case.</p>
      ) : null}
      {canEdit && !closed && !theatreCase.return_of && !editing ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          Mark as return to theatre
        </Button>
      ) : null}
      {editing ? (
        <form
          className="space-y-2 rounded-lg bg-muted/40 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate(
              {
                uuid: theatreCase.uuid,
                payload: {
                  return_of: original,
                  return_reason: reason.trim(),
                  return_planned: planned === "planned",
                },
              },
              { onSuccess: () => setEditing(false) },
            );
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`return-of-${theatreCase.uuid}`}>Original operation</Label>
            <select
              id={`return-of-${theatreCase.uuid}`}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={original}
              onChange={(event) => setOriginal(event.target.value)}
            >
              <option value="">
                {patientCases.isLoading ? "Loading…" : "Choose an earlier case"}
              </option>
              {candidates.map((item) => (
                <option key={item.uuid} value={item.uuid}>
                  {(item.procedure_description || "Theatre case") +
                    (item.actual_start
                      ? ` — ${new Date(item.actual_start).toLocaleDateString()}`
                      : "")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 text-sm">
            {(["unplanned", "planned"] as const).map((value) => (
              <label key={value} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name={`return-planned-${theatreCase.uuid}`}
                  checked={planned === value}
                  onChange={() => setPlanned(value)}
                />
                {value === "planned" ? "Planned (staged)" : "Unplanned (complication)"}
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`return-reason-${theatreCase.uuid}`}>Reason</Label>
            <Textarea
              id={`return-reason-${theatreCase.uuid}`}
              rows={2}
              value={reason}
              placeholder="e.g. Anastomotic leak, bleeding, wound dehiscence"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!original || !reason.trim() || update.isPending}
            >
              Link case
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
      {update.error ? (
        <p className="text-sm text-red-600">
          {update.error instanceof Error ? update.error.message : "Could not save."}
        </p>
      ) : null}
    </div>
  );
}
