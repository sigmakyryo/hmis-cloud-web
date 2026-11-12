"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TheatreChartEntryList } from "@/features/clinical-theatre/components/TheatreChartEntryList";
import {
  useAddTheatreAnaesthesiaVital,
  useSignTheatreAnaesthesia,
  useTheatreAnaesthesia,
  useUpdateTheatreAnaesthesia,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  THEATRE_AIRWAYS,
  THEATRE_ANAESTHESIA_TECHNIQUES,
  type AddTheatreAnaesthesiaVitalPayload,
  type TheatreCase,
  type TheatreChartEntry,
  type UpdateTheatreAnaesthesiaPayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { localInputToIso } from "@/features/clinical-theatre/utils/theatre-case-display";
import {
  AIRWAY_LABELS,
  ANAESTHESIA_TECHNIQUE_LABELS,
  errorMessage,
  isAnaesthesiaEditable,
  isoToLocalInput,
  parseOptionalNumber,
} from "@/features/clinical-theatre/utils/theatre-record-display";

type ListKey = "agents" | "fluids" | "blood_products" | "events";

const LISTS: { key: ListKey; title: string; name: string; detail: string }[] = [
  { key: "agents", title: "Agents", name: "Drug", detail: "Dose" },
  { key: "fluids", title: "Fluids", name: "Fluid", detail: "Volume (mL)" },
  { key: "blood_products", title: "Blood", name: "Product", detail: "Units / mL" },
  { key: "events", title: "Events", name: "Event", detail: "Time / detail" },
];

const TIMES: { key: "anaesthesia_start" | "induction_at" | "anaesthesia_end"; label: string }[] = [
  { key: "anaesthesia_start", label: "Anaesthesia start" },
  { key: "induction_at", label: "Induction" },
  { key: "anaesthesia_end", label: "Anaesthesia end" },
];

const VITAL_FIELDS: { key: keyof AddTheatreAnaesthesiaVitalPayload; label: string }[] = [
  { key: "heart_rate", label: "HR" },
  { key: "systolic_bp", label: "SBP" },
  { key: "diastolic_bp", label: "DBP" },
  { key: "spo2", label: "SpO₂" },
  { key: "etco2", label: "EtCO₂" },
  { key: "respiratory_rate", label: "RR" },
  { key: "temperature_c", label: "Temp °C" },
];

/** Intra-operative anaesthesia chart: technique, airway, agents, vitals, times. */
export function TheatreAnaesthesiaPanel({ theatreCase }: { theatreCase: TheatreCase }) {
  const { data: saved, isLoading } = useTheatreAnaesthesia(theatreCase.uuid);
  const update = useUpdateTheatreAnaesthesia();
  const addVital = useAddTheatreAnaesthesiaVital();
  const sign = useSignTheatreAnaesthesia();
  const [draft, setDraft] = useState<UpdateTheatreAnaesthesiaPayload>({});
  const [vital, setVital] = useState<Record<string, string>>({});
  const editable = isAnaesthesiaEditable(theatreCase.status, saved?.signed_at);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading anaesthesia record…</p>;
  }

  const value = <K extends keyof UpdateTheatreAnaesthesiaPayload>(key: K) =>
    (key in draft ? draft[key] : saved?.[key]) as UpdateTheatreAnaesthesiaPayload[K];
  const set = <K extends keyof UpdateTheatreAnaesthesiaPayload>(
    key: K,
    next: UpdateTheatreAnaesthesiaPayload[K],
  ) => setDraft((current) => ({ ...current, [key]: next }));

  const save = () =>
    update.mutate(
      { caseUuid: theatreCase.uuid, payload: draft },
      { onSuccess: () => setDraft({}) },
    );

  const submitVital = () => {
    const payload: AddTheatreAnaesthesiaVitalPayload = {};
    for (const field of VITAL_FIELDS) {
      const parsed = parseOptionalNumber(vital[field.key as string] ?? "");
      if (parsed !== null) {
        (payload as Record<string, number>)[field.key as string] = parsed;
      }
    }
    addVital.mutate(
      { caseUuid: theatreCase.uuid, payload },
      { onSuccess: () => setVital({}) },
    );
  };

  const error = update.error ?? addVital.error ?? sign.error;
  const vitals = saved?.vitals ?? [];

  return (
    <section className="space-y-5" data-testid="theatre-anaesthesia-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-brand-navy">Anaesthesia record</h3>
        {saved?.signed_at ? (
          <p className="text-xs text-muted-foreground">
            Signed {new Date(saved.signed_at).toLocaleString()}
            {saved.signed_by_name ? ` by ${saved.signed_by_name}` : ""}
          </p>
        ) : saved?.anaesthetist_name ? (
          <p className="text-xs text-muted-foreground">
            Anaesthetist: {saved.anaesthetist_name}
          </p>
        ) : null}
      </div>
      {!editable && !saved?.signed_at ? (
        <p className="text-xs text-muted-foreground">
          The anaesthesia record opens at pre-op and closes after recovery.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Technique</Label>
          <Select
            disabled={!editable}
            value={(value("technique") as string) || undefined}
            onValueChange={(next) =>
              set("technique", next as UpdateTheatreAnaesthesiaPayload["technique"])
            }
          >
            <SelectTrigger aria-label="Technique">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {THEATRE_ANAESTHESIA_TECHNIQUES.map((technique) => (
                <SelectItem key={technique} value={technique}>
                  {ANAESTHESIA_TECHNIQUE_LABELS[technique]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Airway</Label>
          <Select
            disabled={!editable}
            value={(value("airway") as string) || undefined}
            onValueChange={(next) =>
              set("airway", next as UpdateTheatreAnaesthesiaPayload["airway"])
            }
          >
            <SelectTrigger aria-label="Airway">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {THEATRE_AIRWAYS.map((airway) => (
                <SelectItem key={airway} value={airway}>
                  {AIRWAY_LABELS[airway]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theatre-airway-notes">Airway notes</Label>
          <Input
            id="theatre-airway-notes"
            disabled={!editable}
            placeholder="Size, grade, attempts"
            value={(value("airway_notes") as string) ?? ""}
            onChange={(event) => set("airway_notes", event.target.value)}
          />
        </div>
        {TIMES.map((time) => (
          <div key={time.key} className="space-y-1.5">
            <Label htmlFor={`theatre-${time.key}`}>{time.label}</Label>
            <DateTimeLocalInput
              id={`theatre-${time.key}`}
              disabled={!editable}
              value={isoToLocalInput(value(time.key) as string | null)}
              onChange={(event) => set(time.key, localInputToIso(event.target.value))}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="theatre-ebl">Estimated blood loss (mL)</Label>
          <Input
            id="theatre-ebl"
            type="number"
            min={0}
            disabled={!editable}
            value={value("estimated_blood_loss_ml") ?? ""}
            onChange={(event) =>
              set("estimated_blood_loss_ml", parseOptionalNumber(event.target.value))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theatre-urine">Urine output (mL)</Label>
          <Input
            id="theatre-urine"
            type="number"
            min={0}
            disabled={!editable}
            value={value("urine_output_ml") ?? ""}
            onChange={(event) =>
              set("urine_output_ml", parseOptionalNumber(event.target.value))
            }
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {LISTS.map((list) => (
          <TheatreChartEntryList
            key={list.key}
            title={list.title}
            nameLabel={list.name}
            detailLabel={list.detail}
            disabled={!editable}
            entries={(value(list.key) as TheatreChartEntry[] | undefined) ?? []}
            onChange={(entries) => set(list.key, entries)}
          />
        ))}
      </div>
      <Textarea
        aria-label="Anaesthesia notes"
        placeholder="Notes"
        disabled={!editable}
        value={(value("notes") as string) ?? ""}
        onChange={(event) => set("notes", event.target.value)}
      />
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={update.isPending || Object.keys(draft).length === 0}
            onClick={save}
          >
            Save anaesthesia record
          </Button>
          <Button
            variant="outline"
            disabled={sign.isPending || Object.keys(draft).length > 0 || !saved}
            onClick={() => sign.mutate(theatreCase.uuid)}
          >
            Sign and lock
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-brand-navy">Vitals timeline</h4>
        {vitals.length === 0 ? (
          <p className="text-xs text-muted-foreground">No vitals recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="theatre-anaesthesia-vitals">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Time</th>
                  {VITAL_FIELDS.map((field) => (
                    <th key={field.key as string} className="py-1 pr-3">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitals.map((row) => (
                  <tr key={row.uuid} className="border-t">
                    <td className="py-1 pr-3">
                      {new Date(row.recorded_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    {VITAL_FIELDS.map((field) => (
                      <td key={field.key as string} className="py-1 pr-3">
                        {row[field.key as keyof typeof row] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editable ? (
          <div className="flex flex-wrap items-end gap-2">
            {VITAL_FIELDS.map((field) => (
              <div key={field.key as string} className="space-y-1">
                <Label htmlFor={`theatre-vital-${field.key as string}`}>{field.label}</Label>
                <Input
                  id={`theatre-vital-${field.key as string}`}
                  type="number"
                  className="w-20"
                  value={vital[field.key as string] ?? ""}
                  onChange={(event) =>
                    setVital((current) => ({
                      ...current,
                      [field.key as string]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              disabled={addVital.isPending || Object.values(vital).every((v) => !v)}
              onClick={submitVital}
            >
              Add vitals
            </Button>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not save.")}</p>
      ) : null}
    </section>
  );
}
