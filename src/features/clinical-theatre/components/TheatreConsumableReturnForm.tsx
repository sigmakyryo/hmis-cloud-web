"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useReturnTheatreConsumable } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreConsumable } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  errorMessage,
  returnableQuantity,
  stockReturnError,
} from "@/features/clinical-theatre/utils/theatre-record-display";

type TheatreConsumableReturnFormProps = {
  caseUuid: string;
  item: TheatreConsumable;
  onDone: () => void;
};

/** Return all or part of an issued item to stock (and reduce its charge). */
export function TheatreConsumableReturnForm({
  caseUuid,
  item,
  onDone,
}: TheatreConsumableReturnFormProps) {
  const available = returnableQuantity(item);
  const batches = item.issued_batches ?? [];
  const splitBatches = batches.length > 1;
  const [quantity, setQuantity] = useState(String(available));
  const [reason, setReason] = useState("");
  const [split, setSplit] = useState<Record<number, string>>({});
  const [touched, setTouched] = useState(false);
  const mutation = useReturnTheatreConsumable();

  const batchSplit = splitBatches
    ? batches.map((row) => ({ batch_id: row.batch_id, quantity: split[row.batch_id] ?? "" }))
    : undefined;
  const validation = stockReturnError(available, quantity, reason, batchSplit);

  return (
    <form
      className="space-y-2 rounded-lg bg-muted/40 p-3"
      data-testid="theatre-consumable-return-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation) return;
        mutation.mutate(
          {
            caseUuid,
            itemUuid: item.uuid,
            payload: {
              quantity,
              reason: reason.trim(),
              ...(batchSplit
                ? {
                    batches: batchSplit
                      .filter((row) => Number(row.quantity) > 0)
                      .map((row) => ({ batch_id: row.batch_id, quantity: row.quantity })),
                  }
                : {}),
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <p className="text-xs text-muted-foreground">
        Returns go back to the store they were issued from and reduce the billed quantity.
        Up to {available} can be returned.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor={`return-qty-${item.uuid}`}>Quantity</Label>
          <Input
            id={`return-qty-${item.uuid}`}
            type="number"
            min={0}
            max={available}
            step="any"
            className="w-24"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor={`return-reason-${item.uuid}`}>Reason</Label>
          <Input
            id={`return-reason-${item.uuid}`}
            placeholder="e.g. Unopened, not used"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>
      {splitBatches ? (
        <div className="flex flex-wrap gap-2" data-testid="theatre-return-batches">
          {batches.map((row) => (
            <div key={row.batch_id} className="space-y-1">
              <Label htmlFor={`return-batch-${item.uuid}-${row.batch_id}`}>
                Batch {row.batch_number} (issued {Number(row.quantity)})
              </Label>
              <Input
                id={`return-batch-${item.uuid}-${row.batch_id}`}
                type="number"
                min={0}
                max={Number(row.quantity)}
                step="any"
                className="w-24"
                value={split[row.batch_id] ?? ""}
                onChange={(event) =>
                  setSplit((current) => ({ ...current, [row.batch_id]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
      ) : null}
      {touched && validation ? (
        <p className="text-xs text-red-600" role="alert">
          {validation}
        </p>
      ) : null}
      {mutation.error ? (
        <p className="text-xs text-red-600">
          {errorMessage(mutation.error, "Could not return the stock.")}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          Return to stock
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
    </form>
  );
}
