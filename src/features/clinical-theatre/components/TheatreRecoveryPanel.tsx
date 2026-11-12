"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddTheatreRecoveryObservation,
  useDischargeTheatreRecovery,
  useTheatreRecovery,
  useTransitionTheatreCase,
  useUpdateTheatreRecovery,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  THEATRE_ALDRETE_ITEMS,
  THEATRE_HANDOVER_DESTINATIONS,
  type AddTheatreRecoveryObservationPayload,
  type TheatreAldreteItem,
  type TheatreCase,
  type UpdateTheatreRecoveryPayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { THEATRE_STATUS_LABELS } from "@/features/clinical-theatre/utils/theatre-case-display";
import {
  ALDRETE_DISCHARGE_THRESHOLD,
  ALDRETE_ITEM_LABELS,
  HANDOVER_DESTINATION_LABELS,
  aldreteTotal,
  dischargeStatusFor,
  errorMessage,
  parseOptionalNumber,
  recoveryDischargeBlocker,
} from "@/features/clinical-theatre/utils/theatre-record-display";

const SCORE_OPTIONS = ["0", "1", "2"] as const;
const EXTRA_FIELDS = [
  { key: "heart_rate", label: "HR" },
  { key: "systolic_bp", label: "SBP" },
  { key: "diastolic_bp", label: "DBP" },
  { key: "spo2", label: "SpO₂" },
  { key: "pain_score", label: "Pain (0–10)" },
] as const;

const EMPTY_SCORES: Record<TheatreAldreteItem, number> = {
  activity: 2,
  respiration: 2,
  circulation: 2,
  consciousness: 2,
  oxygen_saturation: 2,
};

/** PACU: observations with Aldrete score, handover and recovery discharge. */
export function TheatreRecoveryPanel({ theatreCase }: { theatreCase: TheatreCase }) {
  const { data: record, isLoading } = useTheatreRecovery(theatreCase.uuid);
  const update = useUpdateTheatreRecovery();
  const observe = useAddTheatreRecoveryObservation();
  const discharge = useDischargeTheatreRecovery();
  const transition = useTransitionTheatreCase();
  const [draft, setDraft] = useState<UpdateTheatreRecoveryPayload>({});
  const [scores, setScores] = useState(EMPTY_SCORES);
  const [extra, setExtra] = useState<Record<string, string>>({});

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading recovery…</p>;
  }
  if (!record) {
    return (
      <p className="text-sm text-muted-foreground">
        The recovery record opens when the patient arrives in recovery.
      </p>
    );
  }

  const inRecovery = theatreCase.status === "recovery";
  const open = inRecovery && !record.discharged_at;
  const destination =
    (draft.handover_destination ?? record.handover_destination) || "";
  const blocker = recoveryDischargeBlocker({
    ...record,
    handover_destination: destination,
  });
  const nextStatus = dischargeStatusFor(record.handover_destination);

  const submitObservation = () => {
    const payload: AddTheatreRecoveryObservationPayload = { ...scores };
    for (const field of EXTRA_FIELDS) {
      const parsed = parseOptionalNumber(extra[field.key] ?? "");
      if (parsed !== null) payload[field.key] = parsed;
    }
    observe.mutate(
      { caseUuid: theatreCase.uuid, payload },
      {
        onSuccess: () => {
          setScores(EMPTY_SCORES);
          setExtra({});
        },
      },
    );
  };

  const error = update.error ?? observe.error ?? discharge.error ?? transition.error;

  return (
    <section className="space-y-5" data-testid="theatre-recovery-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-brand-navy">Recovery (PACU)</h3>
        <p className="text-xs text-muted-foreground">
          Arrived {record.arrived_at ? new Date(record.arrived_at).toLocaleString() : "—"}
          {record.discharged_at
            ? ` · Discharged ${new Date(record.discharged_at).toLocaleString()} (Aldrete ${record.discharge_score})`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Handover destination</Label>
          <Select
            disabled={!open}
            value={destination || undefined}
            onValueChange={(next) =>
              setDraft((current) => ({
                ...current,
                handover_destination:
                  next as UpdateTheatreRecoveryPayload["handover_destination"],
              }))
            }
          >
            <SelectTrigger aria-label="Handover destination">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {THEATRE_HANDOVER_DESTINATIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {HANDOVER_DESTINATION_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theatre-handed-over-to">Handed over to</Label>
          <Input
            id="theatre-handed-over-to"
            disabled={!open}
            value={draft.handed_over_to ?? record.handed_over_to}
            onChange={(event) =>
              setDraft((current) => ({ ...current, handed_over_to: event.target.value }))
            }
          />
        </div>
        <div className="flex items-end">
          {open ? (
            <Button
              variant="outline"
              disabled={update.isPending || Object.keys(draft).length === 0}
              onClick={() =>
                update.mutate(
                  { caseUuid: theatreCase.uuid, payload: draft },
                  { onSuccess: () => setDraft({}) },
                )
              }
            >
              Save handover
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-brand-navy">
          Observations (modified Aldrete, discharge at ≥ {ALDRETE_DISCHARGE_THRESHOLD})
        </h4>
        {record.observations.length === 0 ? (
          <p className="text-xs text-muted-foreground">No observations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="theatre-recovery-observations">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Time</th>
                  <th className="py-1 pr-3">Aldrete</th>
                  <th className="py-1 pr-3">HR</th>
                  <th className="py-1 pr-3">BP</th>
                  <th className="py-1 pr-3">SpO₂</th>
                  <th className="py-1 pr-3">Pain</th>
                </tr>
              </thead>
              <tbody>
                {record.observations.map((row) => (
                  <tr key={row.uuid} className="border-t">
                    <td className="py-1 pr-3">
                      {new Date(row.recorded_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-1 pr-3 font-medium">{row.aldrete_total}/10</td>
                    <td className="py-1 pr-3">{row.heart_rate ?? "—"}</td>
                    <td className="py-1 pr-3">
                      {row.systolic_bp && row.diastolic_bp
                        ? `${row.systolic_bp}/${row.diastolic_bp}`
                        : "—"}
                    </td>
                    <td className="py-1 pr-3">{row.spo2 ?? "—"}</td>
                    <td className="py-1 pr-3">{row.pain_score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {open ? (
          <div className="space-y-2 rounded-lg bg-muted/40 p-3">
            <div className="flex flex-wrap items-end gap-2">
              {THEATRE_ALDRETE_ITEMS.map((item) => (
                <div key={item} className="space-y-1">
                  <Label>{ALDRETE_ITEM_LABELS[item]}</Label>
                  <Select
                    value={String(scores[item])}
                    onValueChange={(next) =>
                      setScores((current) => ({ ...current, [item]: Number(next) }))
                    }
                  >
                    <SelectTrigger aria-label={ALDRETE_ITEM_LABELS[item]} className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCORE_OPTIONS.map((score) => (
                        <SelectItem key={score} value={score}>
                          {score}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <p className="pb-2 text-sm font-medium" data-testid="theatre-aldrete-total">
                Total {aldreteTotal(scores)}/10
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {EXTRA_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`theatre-recovery-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`theatre-recovery-${field.key}`}
                    type="number"
                    className="w-20"
                    value={extra[field.key] ?? ""}
                    onChange={(event) =>
                      setExtra((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={observe.isPending}
                onClick={submitObservation}
              >
                Add observation
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="space-y-1">
          <Button
            disabled={discharge.isPending || blocker !== null}
            onClick={() =>
              discharge.mutate(
                { caseUuid: theatreCase.uuid, payload: draft },
                { onSuccess: () => setDraft({}) },
              )
            }
          >
            Discharge from recovery
          </Button>
          {blocker ? <p className="text-xs text-muted-foreground">{blocker}</p> : null}
        </div>
      ) : null}
      {inRecovery && record.discharged_at && nextStatus ? (
        <Button
          disabled={transition.isPending}
          onClick={() => transition.mutate({ uuid: theatreCase.uuid, status: nextStatus })}
        >
          Move case to “{THEATRE_STATUS_LABELS[nextStatus]}”
        </Button>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not save.")}</p>
      ) : null}
    </section>
  );
}
