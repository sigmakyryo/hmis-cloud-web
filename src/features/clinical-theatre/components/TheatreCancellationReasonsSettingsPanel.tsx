"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  useCreateTheatreCancellationReason,
  useTheatreCancellationReasons,
  useUpdateTheatreCancellationReason,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCancellationCategory,
  TheatreCancellationReason,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  CANCELLATION_CATEGORY_LABELS,
  CANCELLATION_CATEGORY_ORDER,
} from "@/features/clinical-theatre/utils/theatre-cancellation-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60";

function ReasonRow({ reason }: { reason: TheatreCancellationReason }) {
  const update = useUpdateTheatreCancellationReason();
  const [label, setLabel] = useState(reason.label);
  const dirty = label.trim() !== reason.label && label.trim().length > 0;
  return (
    <tr className="border-t" data-testid="theatre-cancellation-reason-row">
      <td className="py-1.5 pr-2">
        <Input
          aria-label={`Label for ${reason.code}`}
          value={label}
          disabled={update.isPending}
          onChange={(event) => setLabel(event.target.value)}
        />
        <p className="mt-0.5 text-[11px] text-muted-foreground">{reason.code}</p>
      </td>
      <td className="py-1.5 pr-2">
        <select
          aria-label={`Category for ${reason.code}`}
          className={SELECT_CLASS}
          value={reason.category}
          disabled={update.isPending}
          onChange={(event) =>
            update.mutate({
              uuid: reason.uuid,
              payload: { category: event.target.value as TheatreCancellationCategory },
            })
          }
        >
          {CANCELLATION_CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {CANCELLATION_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-2 text-center">
        <input
          type="checkbox"
          aria-label={`Note required for ${reason.code}`}
          checked={reason.requires_note}
          disabled={update.isPending}
          onChange={(event) =>
            update.mutate({
              uuid: reason.uuid,
              payload: { requires_note: event.target.checked },
            })
          }
        />
      </td>
      <td className="py-1.5 pr-2">
        <StatusDotBadge tone={reason.is_active ? "success" : "neutral"}>
          {reason.is_active ? "Active" : "Retired"}
        </StatusDotBadge>
      </td>
      <td className="py-1.5 text-right">
        <div className="flex justify-end gap-1">
          {dirty ? (
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ uuid: reason.uuid, payload: { label: label.trim() } })
              }
            >
              Save
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                uuid: reason.uuid,
                payload: { is_active: !reason.is_active },
              })
            }
          >
            {reason.is_active ? "Retire" : "Restore"}
          </Button>
        </div>
        {update.error ? (
          <p className="text-xs text-red-600">{errorMessage(update.error, "Could not save.")}</p>
        ) : null}
      </td>
    </tr>
  );
}

/** Settings → Theatre → Cancellation reasons: the standard list for reports. */
export function TheatreCancellationReasonsSettingsPanel() {
  const { data = [], isLoading, error } = useTheatreCancellationReasons({
    includeInactive: true,
  });
  const create = useCreateTheatreCancellationReason();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<TheatreCancellationCategory>("patient");
  const [requiresNote, setRequiresNote] = useState(false);

  const grouped = CANCELLATION_CATEGORY_ORDER.map((key) => ({
    key,
    rows: data
      .filter((reason) => reason.category === key)
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
  })).filter((group) => group.rows.length > 0);

  return (
    <section className="space-y-4" data-testid="theatre-cancellation-reasons-settings">
      <div>
        <h3 className="text-base font-semibold text-brand-navy">Cancellation reasons</h3>
        <p className="text-sm text-muted-foreground">
          Staff pick one of these when a case is cancelled or postponed. Reports group
          cancellations by reason and category and flag those made on the day. Retired
          reasons stay on past cases.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-2 rounded-md border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!label.trim()) return;
          create.mutate(
            { label: label.trim(), category, requires_note: requiresNote },
            {
              onSuccess: () => {
                setLabel("");
                setRequiresNote(false);
              },
            },
          );
        }}
      >
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="theatre-new-reason">New reason</Label>
          <Input
            id="theatre-new-reason"
            placeholder="e.g. Blood not cross-matched"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="theatre-new-reason-category">Category</Label>
          <select
            id="theatre-new-reason-category"
            className={SELECT_CLASS}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as TheatreCancellationCategory)
            }
          >
            {CANCELLATION_CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>
                {CANCELLATION_CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 pb-2 text-sm">
          <input
            type="checkbox"
            checked={requiresNote}
            onChange={(event) => setRequiresNote(event.target.checked)}
          />
          Note required
        </label>
        <Button type="submit" disabled={!label.trim() || create.isPending}>
          Add reason
        </Button>
        {create.error ? (
          <p className="w-full text-xs text-red-600">
            {errorMessage(create.error, "Could not add the reason.")}
          </p>
        ) : null}
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not load reasons.")}</p>
      ) : (
        grouped.map((group) => (
          <div key={group.key} className="space-y-1">
            <h4 className="text-sm font-medium">{CANCELLATION_CATEGORY_LABELS[group.key]}</h4>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Reason</th>
                  <th className="py-1 pr-2">Category</th>
                  <th className="py-1 pr-2 text-center">Note required</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {group.rows.map((reason) => (
                  <ReasonRow key={`${reason.uuid}:${reason.label}`} reason={reason} />
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  );
}
