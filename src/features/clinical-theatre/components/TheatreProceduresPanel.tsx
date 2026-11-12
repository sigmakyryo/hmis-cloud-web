"use client";

import { useState } from "react";
import { Link2, Receipt, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TheatreProcedureApproach,
  TheatreProcedureLaterality,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import type { TheatreProcedureProduct } from "@/features/clinical-theatre/types/theatre-catalog.types";
import {
  APPROACH_OPTIONS,
  LATERALITY_OPTIONS,
  procedureDetailLine,
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

const BADGE_CLASS = "ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase";

function BillingBadge({ procedure }: { procedure: TheatreCaseProcedure }) {
  const state = procedureBillingState(procedure);
  if (state === "legacy") {
    return (
      <span className={`${BADGE_CLASS} bg-amber-100 text-amber-800`}>
        Legacy (free text)
      </span>
    );
  }
  if (state === "billed") {
    return <span className={`${BADGE_CLASS} bg-emerald-100 text-emerald-800`}>Billed</span>;
  }
  return <span className={`${BADGE_CLASS} bg-slate-100 text-slate-700`}>Not billed</span>;
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
      {update.error ? (
        <p className="w-full text-xs text-red-600">{errorText(update.error)}</p>
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
  const add = useAddTheatreCaseProcedure();
  const update = useUpdateTheatreCaseProcedure();
  const remove = useRemoveTheatreCaseProcedure();
  const bill = useBillTheatreCaseProcedure();
  const [product, setProduct] = useState<TheatreProcedureProduct | null>(null);
  const [freeText, setFreeText] = useState(false);
  const [name, setName] = useState("");
  const [laterality, setLaterality] = useState<TheatreProcedureLaterality | "">("");
  const [approach, setApproach] = useState<TheatreProcedureApproach | "">("");
  const [linking, setLinking] = useState<string | null>(null);
  const procedures = theatreCase.procedures ?? [];
  const editable = canEdit && theatreCase.status !== "cancelled";
  const error =
    errorText(add.error) ??
    errorText(update.error) ??
    errorText(remove.error) ??
    errorText(bill.error);
  const ready = freeText ? Boolean(name.trim()) : product !== null;

  function reset() {
    setProduct(null);
    setName("");
    setLaterality("");
    setApproach("");
    setFreeText(false);
  }

  return (
    <div className="space-y-3" data-testid="theatre-procedures-panel">
      {procedures.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {theatreCase.procedure_description
            ? theatreCase.procedure_description
            : "No procedure recorded yet."}
        </p>
      ) : (
        <ol className="divide-y divide-dash-border/70 border-y border-dash-border/70">
          {procedures.map((procedure) => {
            const codes = formatProcedureCodes(procedure.coding);
            const billable = canBill && canBillProcedure(procedure, theatreCase.status);
            return (
              <li key={procedure.uuid} className="px-3 py-2" data-testid="theatre-procedure-row">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-brand-navy">
                      {procedureDetailLine(procedure)}
                      {procedure.is_primary ? (
                        <span className={`${BADGE_CLASS} bg-brand-navy/10 text-brand-navy`}>
                          Primary
                        </span>
                      ) : null}
                      <BillingBadge procedure={procedure} />
                    </p>
                    {procedure.product_name || codes ? (
                      <p className="text-xs text-muted-foreground">
                        {[
                          procedure.product_name ? `Catalogue: ${procedure.product_name}` : "",
                          codes,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {procedure.surgeon_name ? (
                      <p className="text-xs text-muted-foreground">
                        Surgeon: {procedure.surgeon_name}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
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
                        <Receipt className="mr-1 size-4" aria-hidden />
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
                        <Link2 className="size-4" aria-hidden />
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
                        <Star className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                    {editable && procedures.length > 1 ? (
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
                </div>
                {linking === procedure.uuid ? (
                  <LinkToCatalogue
                    theatreCase={theatreCase}
                    procedure={procedure}
                    onDone={() => setLinking(null)}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {editable ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            add.mutate(
              {
                uuid: theatreCase.uuid,
                payload: freeText
                  ? { name: name.trim(), laterality, approach }
                  : { product: product?.uuid ?? null, laterality, approach },
              },
              { onSuccess: reset },
            );
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor={`procedure-name-${theatreCase.uuid}`}>Add procedure</Label>
              {freeText ? (
                <Input
                  id={`procedure-name-${theatreCase.uuid}`}
                  value={name}
                  placeholder="Free-text procedure (not billable)"
                  onChange={(event) => setName(event.target.value)}
                />
              ) : (
                <TheatreProcedureProductPicker
                  id={`procedure-name-${theatreCase.uuid}`}
                  caseUuid={theatreCase.uuid}
                  value={product}
                  onChange={setProduct}
                />
              )}
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
            <Button type="submit" size="sm" disabled={!ready || add.isPending}>
              Add
            </Button>
          </div>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              setFreeText((value) => !value);
              setProduct(null);
              setName("");
            }}
          >
            {freeText
              ? "Choose from the procedure catalogue instead"
              : "Not in the catalogue? Enter free text (legacy, not billable)"}
          </button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
