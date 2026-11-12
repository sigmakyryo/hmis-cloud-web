"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useConfirmAllTheatrePlannedItems,
  useConfirmTheatrePlannedItem,
  useDismissTheatrePlannedItem,
  useLoadTheatrePreferenceCard,
  useSaveTheatreCaseAsPreferenceCard,
  useTheatrePlannedItems,
} from "@/features/clinical-theatre/hooks/use-theatre-catalog";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type { TheatrePlannedItem } from "@/features/clinical-theatre/types/theatre-catalog.types";
import {
  BILLABLE_CASE_STATUSES,
  plannedItemCounts,
} from "@/features/clinical-theatre/utils/theatre-catalog-display";

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

function SetupLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      {value}
    </p>
  );
}

function PlannedRow({
  caseUuid,
  item,
  canConfirm,
  canDismiss,
}: {
  caseUuid: string;
  item: TheatrePlannedItem;
  canConfirm: boolean;
  canDismiss: boolean;
}) {
  const confirm = useConfirmTheatrePlannedItem();
  const dismiss = useDismissTheatrePlannedItem();
  const [quantity, setQuantity] = useState(item.quantity);
  const planned = item.status === "planned";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" data-testid="theatre-planned-item">
      <div className="min-w-0">
        <p className="text-sm font-medium">{item.product_name}</p>
        <p className="text-xs text-muted-foreground">
          {planned
            ? `Planned × ${item.quantity}${item.notes ? ` · ${item.notes}` : ""}`
            : `${item.status_label} × ${item.quantity}${item.decided_by_name ? ` by ${item.decided_by_name}` : ""}`}
        </p>
        {confirm.error || dismiss.error ? (
          <p className="text-xs text-red-600">
            {errorText(confirm.error) ?? errorText(dismiss.error)}
          </p>
        ) : null}
      </div>
      {planned ? (
        <div className="flex items-center gap-1">
          {canConfirm ? (
            <>
              <Input
                aria-label={`Quantity of ${item.product_name}`}
                className="h-8 w-20"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={`Confirm ${item.product_name}`}
                disabled={confirm.isPending}
                onClick={() =>
                  confirm.mutate({ uuid: caseUuid, itemUuid: item.uuid, quantity })
                }
              >
                <Check className="size-4" aria-hidden />
              </Button>
            </>
          ) : null}
          {canDismiss ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Dismiss ${item.product_name}`}
              disabled={dismiss.isPending}
              onClick={() => dismiss.mutate({ uuid: caseUuid, itemUuid: item.uuid })}
            >
              <X className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * The lead surgeon's preference card for the primary procedure, loaded as
 * planned items. Nothing is billed until an item is confirmed.
 */
export function TheatrePreferenceCardPanel({
  theatreCase,
  canRecord,
  canManageCards,
}: {
  theatreCase: TheatreCase;
  canRecord: boolean;
  canManageCards: boolean;
}) {
  const planned = useTheatrePlannedItems(theatreCase.uuid);
  const load = useLoadTheatrePreferenceCard();
  const confirmAll = useConfirmAllTheatrePlannedItems();
  const save = useSaveTheatreCaseAsPreferenceCard();
  const data = planned.data;
  const items = data?.items ?? [];
  const counts = plannedItemCounts(items);
  const inSuite = BILLABLE_CASE_STATUSES.has(theatreCase.status);
  const closed = ["cancelled", "postponed", "discharged_ward", "discharged_home"].includes(
    theatreCase.status,
  );
  const setup = data?.setup ?? {};
  const error =
    errorText(load.error) ?? errorText(confirmAll.error) ?? errorText(save.error);

  if (planned.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading preference card…</p>;
  }

  return (
    <div className="space-y-3" data-testid="theatre-preference-card-panel">
      {data?.preference_card_uuid ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-brand-navy">
            {data.preference_card_title || "Preference card"}
          </p>
          <SetupLine label="Positioning" value={setup.positioning} />
          <SetupLine label="Skin prep" value={setup.skin_prep} />
          <SetupLine label="Equipment" value={setup.equipment} />
          <SetupLine label="Trays" value={(setup.instrument_trays ?? []).join(", ")} />
          <SetupLine label="Notes" value={setup.notes} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No preference card loaded. A card loads automatically once the case has a
          lead surgeon and a catalogue procedure.
        </p>
      )}

      {!closed && canRecord && !data?.preference_card_uuid && data?.suggested_card_uuid ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={load.isPending}
          onClick={() =>
            load.mutate({ uuid: theatreCase.uuid, cardUuid: data.suggested_card_uuid })
          }
        >
          Load surgeon&apos;s card
        </Button>
      ) : null}

      {items.length ? (
        <>
          <p className="text-xs text-muted-foreground">
            {counts.planned} planned · {counts.confirmed} confirmed · {counts.dismissed}{" "}
            dismissed. Planned items are not billed until confirmed.
          </p>
          <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
            {items.map((item) => (
              <PlannedRow
                key={item.uuid}
                caseUuid={theatreCase.uuid}
                item={item}
                canConfirm={canRecord && inSuite}
                canDismiss={canRecord && !closed}
              />
            ))}
          </ul>
          {canRecord && !inSuite && counts.planned > 0 ? (
            <p className="text-xs text-muted-foreground">
              Items can be confirmed (and billed) once the patient is in theatre.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canRecord && inSuite && counts.planned > 0 ? (
          <Button
            type="button"
            size="sm"
            disabled={confirmAll.isPending}
            onClick={() => confirmAll.mutate(theatreCase.uuid)}
          >
            Confirm all planned
          </Button>
        ) : null}
        {canRecord && !closed && data?.preference_card_uuid ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={load.isPending}
            onClick={() =>
              load.mutate({ uuid: theatreCase.uuid, cardUuid: data.preference_card_uuid })
            }
          >
            Reload card
          </Button>
        ) : null}
        {canManageCards ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={save.isPending}
            onClick={() => save.mutate({ uuid: theatreCase.uuid })}
          >
            Save as my preference card
          </Button>
        ) : null}
      </div>
      {confirmAll.data?.result?.errors.length ? (
        <p className="text-xs text-red-600">
          {confirmAll.data.result.errors.length} item(s) could not be confirmed:{" "}
          {confirmAll.data.result.errors.map((row) => row.error).join("; ")}
        </p>
      ) : null}
      {save.isSuccess ? (
        <p className="text-xs text-emerald-700">
          Saved {save.data?.title || "your preference card"}.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
