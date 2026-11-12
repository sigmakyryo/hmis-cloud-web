"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddTheatreCaseProcedure,
  useRemoveTheatreCaseProcedure,
  useUpdateTheatreCaseProcedure,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreProcedureApproach,
  TheatreProcedureLaterality,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  APPROACH_OPTIONS,
  LATERALITY_OPTIONS,
  procedureDetailLine,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60";

/** Procedures of a case: the primary first, then any others done in the same sitting. */
export function TheatreProceduresPanel({
  theatreCase,
  canEdit,
}: {
  theatreCase: TheatreCase;
  canEdit: boolean;
}) {
  const add = useAddTheatreCaseProcedure();
  const update = useUpdateTheatreCaseProcedure();
  const remove = useRemoveTheatreCaseProcedure();
  const [name, setName] = useState("");
  const [laterality, setLaterality] = useState<TheatreProcedureLaterality | "">("");
  const [approach, setApproach] = useState<TheatreProcedureApproach | "">("");
  const [code, setCode] = useState("");
  const procedures = theatreCase.procedures ?? [];
  const editable = canEdit && theatreCase.status !== "cancelled";
  const error = errorText(add.error) ?? errorText(update.error) ?? errorText(remove.error);

  return (
    <div className="space-y-3" data-testid="theatre-procedures-panel">
      {procedures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {theatreCase.procedure_description
            ? theatreCase.procedure_description
            : "No procedure recorded yet."}
        </p>
      ) : (
        <ol className="divide-y rounded-md border">
          {procedures.map((procedure) => (
            <li
              key={procedure.uuid}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-navy">
                  {procedureDetailLine(procedure)}
                  {procedure.is_primary ? (
                    <span className="ml-2 rounded bg-brand-navy/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-brand-navy">
                      Primary
                    </span>
                  ) : null}
                </p>
                {procedure.surgeon_name ? (
                  <p className="text-xs text-muted-foreground">
                    Surgeon: {procedure.surgeon_name}
                  </p>
                ) : null}
              </div>
              {editable ? (
                <div className="flex items-center gap-1">
                  {!procedure.is_primary ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Make ${procedure.name} primary`}
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          uuid: theatreCase.uuid,
                          procedureUuid: procedure.uuid,
                          payload: { is_primary: true },
                        })
                      }
                    >
                      <Star className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                  {procedures.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${procedure.name}`}
                      disabled={remove.isPending}
                      onClick={() =>
                        remove.mutate({
                          uuid: theatreCase.uuid,
                          procedureUuid: procedure.uuid,
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {editable ? (
        <form
          className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            add.mutate(
              {
                uuid: theatreCase.uuid,
                payload: { name: name.trim(), laterality, approach, code: code.trim() },
              },
              {
                onSuccess: () => {
                  setName("");
                  setLaterality("");
                  setApproach("");
                  setCode("");
                },
              },
            );
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`procedure-name-${theatreCase.uuid}`}>Add procedure</Label>
            <Input
              id={`procedure-name-${theatreCase.uuid}`}
              value={name}
              placeholder="e.g. Appendicectomy"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`procedure-side-${theatreCase.uuid}`}>Side</Label>
            <select
              id={`procedure-side-${theatreCase.uuid}`}
              className={SELECT_CLASS}
              value={laterality}
              onChange={(event) =>
                setLaterality(event.target.value as TheatreProcedureLaterality | "")
              }
            >
              <option value="">—</option>
              {LATERALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`procedure-approach-${theatreCase.uuid}`}>Approach</Label>
            <select
              id={`procedure-approach-${theatreCase.uuid}`}
              className={SELECT_CLASS}
              value={approach}
              onChange={(event) =>
                setApproach(event.target.value as TheatreProcedureApproach | "")
              }
            >
              <option value="">—</option>
              {APPROACH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`procedure-code-${theatreCase.uuid}`}>Code</Label>
            <Input
              id={`procedure-code-${theatreCase.uuid}`}
              value={code}
              placeholder="Optional"
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={!name.trim() || add.isPending}>
            Add
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
