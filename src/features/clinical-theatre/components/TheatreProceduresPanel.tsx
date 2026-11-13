"use client";

import { useState, type FormEvent } from "react";
import { Link2, Receipt, Scissors, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TheatreProcedureProductPicker } from "@/features/clinical-theatre/components/TheatreProcedureProductPicker";
import {
  useAddTheatreCaseProcedure,
  useRemoveTheatreCaseProcedure,
  useUpdateTheatreCaseProcedure,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { useBillTheatreCaseProcedure } from "@/features/clinical-theatre/hooks/use-theatre-catalog";
import type {
  TheatreCase,
  TheatreCaseProcedure,
  TheatreCaseProcedurePayload,
  TheatreProcedureApproach,
  TheatreProcedureLaterality,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import type { TheatreProcedureProduct } from "@/features/clinical-theatre/types/theatre-catalog.types";
import {
  APPROACH_OPTIONS,
  LATERALITY_OPTIONS,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";
import {
  canBillProcedure,
  formatProcedureCodes,
  procedureBillingState,
} from "@/features/clinical-theatre/utils/theatre-catalog-display";

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60";

const BADGE_CLASS = "ml-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase";

function BillingBadge({ procedure }: { procedure: TheatreCaseProcedure }) {
  const state = procedureBillingState(procedure);
  if (state === "legacy") {
    return <span className={`${BADGE_CLASS} bg-amber-100 text-amber-800`}>Legacy (free text)</span>;
  }
  if (state === "billed") {
    return <span className={`${BADGE_CLASS} bg-emerald-100 text-emerald-800`}>Billed</span>;
  }
  return <span className={`${BADGE_CLASS} bg-slate-100 text-slate-700`}>Not billed</span>;
}

function productStub(procedure: TheatreCaseProcedure): TheatreProcedureProduct | null {
  if (!procedure.product_uuid) return null;
  return {
    uuid: procedure.product_uuid,
    name: procedure.product_name || procedure.name,
    display_name: procedure.product_name || procedure.name,
    default_code: procedure.code,
    list_price: "",
    price: "",
    price_source: "list_price",
    scope: "",
    codes: procedure.coding ?? [],
  };
}

function LinkToCatalogue({
  theatreCase,
  procedure,
  onDone,
}: {
  theatreCase: TheatreCase;
  procedure: TheatreCaseProcedure;
  onDone: () => void;
}) {
  const update = useUpdateTheatreCaseProcedure();
  const [product, setProduct] = useState<TheatreProcedureProduct | null>(null);
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2" data-testid="theatre-procedure-link">
      <div className="min-w-[16rem] flex-1">
        <TheatreProcedureProductPicker
          id={`procedure-link-${procedure.uuid}`}
          caseUuid={theatreCase.uuid}
          value={product}
          onChange={setProduct}
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={!product || update.isPending}
        onClick={() =>
          product &&
          update.mutate(
            {
              uuid: theatreCase.uuid,
              procedureUuid: procedure.uuid,
              // Why: keep the typed name; the code and coding come from the product.
              payload: { product: product.uuid, name: procedure.name, code: "" },
            },
            { onSuccess: onDone },
          )
        }
      >
        Link
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      {update.error ? <p className="w-full text-xs text-red-600">{errorText(update.error)}</p> : null}
    </div>
  );
}

type DialogState = { mode: "add" } | { mode: "edit"; procedure: TheatreCaseProcedure };

function ProcedureFormDialog({
  theatreCase,
  state,
  onClose,
}: {
  theatreCase: TheatreCase;
  state: DialogState;
  onClose: () => void;
}) {
  const add = useAddTheatreCaseProcedure();
  const update = useUpdateTheatreCaseProcedure();
  const editing = state.mode === "edit" ? state.procedure : null;
  const [freeText, setFreeText] = useState(() => Boolean(editing && !editing.product_uuid));
  const [name, setName] = useState(editing?.name ?? "");
  const [product, setProduct] = useState<TheatreProcedureProduct | null>(() =>
    editing ? productStub(editing) : null,
  );
  const [laterality, setLaterality] = useState<TheatreProcedureLaterality | "">(
    editing?.laterality ?? "",
  );
  const [approach, setApproach] = useState<TheatreProcedureApproach | "">(editing?.approach ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const pending = add.isPending || update.isPending;
  const error = errorText(add.error) ?? errorText(update.error);
  const ready = freeText ? Boolean(name.trim()) : product !== null;

  function payload(): TheatreCaseProcedurePayload {
    const base: TheatreCaseProcedurePayload = {
      laterality,
      approach,
      ...(editing || notes.trim() ? { notes: notes.trim() } : {}),
    };
    if (freeText) return { ...base, name: name.trim() };
    return { ...base, product: product?.uuid ?? null };
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    if (editing) {
      update.mutate(
        { uuid: theatreCase.uuid, procedureUuid: editing.uuid, payload: payload() },
        { onSuccess: onClose },
      );
    } else {
      add.mutate({ uuid: theatreCase.uuid, payload: payload() }, { onSuccess: onClose });
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-xl" data-testid="theatre-procedure-dialog">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit procedure" : "Add procedure"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the catalogue link, side, approach or notes."
              : "Pick from the catalogue. The first procedure on the case is primary."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-procedure-name">Procedure</Label>
            {freeText ? (
              <Input
                id="theatre-procedure-name"
                value={name}
                placeholder="Free-text procedure (not billable)"
                onChange={(event) => setName(event.target.value)}
              />
            ) : (
              <TheatreProcedureProductPicker
                id="theatre-procedure-name"
                caseUuid={theatreCase.uuid}
                value={product}
                onChange={setProduct}
              />
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="theatre-procedure-notes">Notes</Label>
            <Textarea
              id="theatre-procedure-notes"
              value={notes}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              setFreeText((value) => !value);
              setProduct(null);
              setName(editing && !editing.product_uuid ? editing.name : "");
            }}
          >
            {freeText
              ? "Choose from the procedure catalogue instead"
              : "Not in the catalogue? Enter free text (legacy, not billable)"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready || pending}>
              {pending ? (editing ? "Saving…" : "Adding…") : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveProcedureDialog({
  procedure,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  procedure: TheatreCaseProcedure;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-sm" data-testid="theatre-procedure-remove-confirm">
        <DialogHeader>
          <DialogTitle>Remove procedure</DialogTitle>
          <DialogDescription>
            Remove {procedure.name} from this case? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyProcedures({
  description,
  editable,
  onAdd,
}: {
  description: string;
  editable: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center px-4 py-10 text-center"
      data-testid="theatre-procedures-empty"
    >
      <Scissors className="mb-3 size-8 text-brand-muted" aria-hidden />
      {description ? (
        <>
          <p className="text-[13px] font-medium text-brand-navy">No procedures on the list yet</p>
          <p className="mt-1 max-w-sm text-[12px] leading-5 text-muted-foreground">
            {`Recorded as “${description}”. Add it from the catalogue so it can be coded and billed.`}
          </p>
        </>
      ) : (
        <>
          <p className="text-[13px] font-medium text-brand-navy">No procedure recorded</p>
          <p className="mt-1 max-w-sm text-[12px] leading-5 text-muted-foreground">
            Add the operation from the catalogue. The first is the primary procedure.
          </p>
        </>
      )}
      {editable ? (
        <Button type="button" size="sm" className="mt-4" onClick={onAdd}>
          Add procedure
        </Button>
      ) : null}
    </div>
  );
}

/** Procedures of a case, chosen from the products catalogue (free text is legacy only). */
export function TheatreProceduresPanel({
  theatreCase,
  canEdit,
  canBill = false,
}: {
  theatreCase: TheatreCase;
  canEdit: boolean;
  canBill?: boolean;
}) {
  const update = useUpdateTheatreCaseProcedure();
  const remove = useRemoveTheatreCaseProcedure();
  const bill = useBillTheatreCaseProcedure();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [pendingRemove, setPendingRemove] = useState<TheatreCaseProcedure | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const procedures = theatreCase.procedures ?? [];
  const editable = canEdit && theatreCase.status !== "cancelled";
  const error = errorText(update.error) ?? errorText(remove.error) ?? errorText(bill.error);

  return (
    <div className="space-y-3" data-testid="theatre-procedures-panel">
      {procedures.length === 0 ? (
        <EmptyProcedures
          description={theatreCase.procedure_description?.trim() ?? ""}
          editable={editable}
          onAdd={() => setDialog({ mode: "add" })}
        />
      ) : (
        <>
          {editable ? (
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={() => setDialog({ mode: "add" })}>
                Add procedure
              </Button>
            </div>
          ) : null}
          <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
            {procedures.map((procedure) => {
              const codes = formatProcedureCodes(procedure.coding);
              const billable = canBill && canBillProcedure(procedure, theatreCase.status);
              const meta = [
                procedure.code,
                codes,
                procedure.laterality && procedure.laterality !== "not_applicable"
                  ? procedure.laterality_label
                  : "",
                procedure.approach_label,
                procedure.product_name ? `Catalogue: ${procedure.product_name}` : "",
              ].filter(Boolean);
              return (
                <li
                  key={procedure.uuid}
                  className="flex flex-wrap items-start justify-between gap-3 py-3"
                  data-testid="theatre-procedure-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-brand-navy">
                      {procedure.name}
                      {procedure.is_primary ? (
                        <span className={`${BADGE_CLASS} bg-brand-navy/10 text-brand-navy`}>
                          Primary
                        </span>
                      ) : null}
                      <BillingBadge procedure={procedure} />
                    </p>
                    {meta.length > 0 ? (
                      <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                        {meta.join(" · ")}
                      </p>
                    ) : null}
                    {procedure.surgeon_name ? (
                      <p className="text-[12px] text-muted-foreground">
                        Surgeon: {procedure.surgeon_name}
                      </p>
                    ) : null}
                    {procedure.notes ? (
                      <p className="text-[12px] text-muted-foreground">Notes: {procedure.notes}</p>
                    ) : null}
                    {linking === procedure.uuid ? (
                      <LinkToCatalogue
                        theatreCase={theatreCase}
                        procedure={procedure}
                        onDone={() => setLinking(null)}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {editable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${procedure.name}`}
                        onClick={() => setDialog({ mode: "edit", procedure })}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {editable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${procedure.name}`}
                        onClick={() => setPendingRemove(procedure)}
                      >
                        Remove
                      </Button>
                    ) : null}
                    {billable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`Bill ${procedure.name}`}
                        disabled={bill.isPending}
                        onClick={() =>
                          bill.mutate({
                            uuid: theatreCase.uuid,
                            procedureUuid: procedure.uuid,
                          })
                        }
                      >
                        <Receipt className="mr-1 size-3.5" aria-hidden />
                        Bill
                      </Button>
                    ) : null}
                    {editable && !procedure.product_uuid ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Link ${procedure.name} to the catalogue`}
                        onClick={() => setLinking(procedure.uuid)}
                      >
                        <Link2 className="size-3.5" aria-hidden />
                        Link
                      </Button>
                    ) : null}
                    {editable && !procedure.is_primary ? (
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
                        <Star className="mr-1 size-3.5" aria-hidden />
                        Primary
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {dialog ? (
        <ProcedureFormDialog
          key={dialog.mode === "edit" ? dialog.procedure.uuid : "add"}
          theatreCase={theatreCase}
          state={dialog}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {pendingRemove ? (
        <RemoveProcedureDialog
          procedure={pendingRemove}
          pending={remove.isPending}
          error={errorText(remove.error)}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() =>
            remove.mutate(
              { uuid: theatreCase.uuid, procedureUuid: pendingRemove.uuid },
              { onSuccess: () => setPendingRemove(null) },
            )
          }
        />
      ) : null}
    </div>
  );
}
