"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TheatreBabyForm } from "@/features/clinical-theatre/components/TheatreBabyForm";
import { TheatreNewbornRegisterForm } from "@/features/clinical-theatre/components/TheatreNewbornRegisterForm";
import {
  useRemoveTheatreBaby,
  useTheatreObstetric,
  useUpdateTheatreObstetric,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreBaby,
  TheatreCaesareanCategory,
  TheatreCase,
  TheatreObstetricRecord,
  TheatrePlacentaDelivery,
  TheatreUterineIncision,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  CAESAREAN_CATEGORY_OPTIONS,
  PLACENTA_OPTIONS,
  UTERINE_INCISION_OPTIONS,
  apgarTone,
  canAdmitBaby,
  canRecordBabies,
  canRegisterBaby,
  formatApgar,
  formatBirthWeight,
  isLowBirthWeight,
  isObstetricEligible,
  isObstetricRecordEditable,
  parseOptionalInt,
} from "@/features/clinical-theatre/utils/theatre-obstetric-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

type NumberField =
  | "gestation_weeks"
  | "gestation_days"
  | "gravida"
  | "para"
  | "previous_caesareans"
  | "decision_to_delivery_minutes"
  | "estimated_blood_loss_ml";

const NUMBER_FIELDS: { key: NumberField; label: string }[] = [
  { key: "gestation_weeks", label: "Gestation (weeks)" },
  { key: "gestation_days", label: "+ days" },
  { key: "gravida", label: "Gravida" },
  { key: "para", label: "Para" },
  { key: "previous_caesareans", label: "Previous caesareans" },
  { key: "decision_to_delivery_minutes", label: "Decision-to-delivery (min)" },
  { key: "estimated_blood_loss_ml", label: "Blood loss (ml)" },
];

function text(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function ObstetricRecordForm({
  caseUuid,
  record,
  canEdit,
}: {
  caseUuid: string;
  record: TheatreObstetricRecord | null;
  canEdit: boolean;
}) {
  const [category, setCategory] = useState<TheatreCaesareanCategory | "">(
    record?.caesarean_category ?? "",
  );
  const [indication, setIndication] = useState(record?.indication ?? "");
  const [incision, setIncision] = useState<TheatreUterineIncision | "">(
    record?.uterine_incision ?? "",
  );
  const [placenta, setPlacenta] = useState<TheatrePlacentaDelivery | "">(
    record?.placenta ?? "",
  );
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(() =>
    Object.fromEntries(
      NUMBER_FIELDS.map((field) => [field.key, text(record?.[field.key])]),
    ) as Record<NumberField, string>,
  );
  const [complications, setComplications] = useState(record?.complications ?? "");
  const [saved, setSaved] = useState(false);
  const mutation = useUpdateTheatreObstetric();

  return (
    <form
      className="space-y-3"
      data-testid="theatre-obstetric-record-form"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        mutation.mutate(
          {
            caseUuid,
            payload: {
              caesarean_category: category,
              indication: indication.trim(),
              uterine_incision: incision,
              placenta,
              complications: complications.trim(),
              ...Object.fromEntries(
                NUMBER_FIELDS.map((field) => [field.key, parseOptionalInt(numbers[field.key])]),
              ),
            },
          },
          { onSuccess: () => setSaved(true) },
        );
      }}
    >
      <fieldset disabled={!canEdit} className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`cs-category-${caseUuid}`}>Urgency category</Label>
            <select
              id={`cs-category-${caseUuid}`}
              className={SELECT_CLASS}
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as TheatreCaesareanCategory | "")
              }
            >
              <option value="">Not recorded</option>
              {CAESAREAN_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`cs-indication-${caseUuid}`}>Indication</Label>
            <Input
              id={`cs-indication-${caseUuid}`}
              placeholder="e.g. Fetal distress, obstructed labour"
              value={indication}
              onChange={(event) => setIndication(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {NUMBER_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`cs-${field.key}-${caseUuid}`}>{field.label}</Label>
              <Input
                id={`cs-${field.key}-${caseUuid}`}
                type="number"
                min={0}
                value={numbers[field.key]}
                onChange={(event) =>
                  setNumbers((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`cs-incision-${caseUuid}`}>Uterine incision</Label>
            <select
              id={`cs-incision-${caseUuid}`}
              className={SELECT_CLASS}
              value={incision}
              onChange={(event) =>
                setIncision(event.target.value as TheatreUterineIncision | "")
              }
            >
              <option value="">Not recorded</option>
              {UTERINE_INCISION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`cs-placenta-${caseUuid}`}>Placenta</Label>
            <select
              id={`cs-placenta-${caseUuid}`}
              className={SELECT_CLASS}
              value={placenta}
              onChange={(event) =>
                setPlacenta(event.target.value as TheatrePlacentaDelivery | "")
              }
            >
              <option value="">Not recorded</option>
              {PLACENTA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`cs-complications-${caseUuid}`}>Complications</Label>
          <Textarea
            id={`cs-complications-${caseUuid}`}
            rows={2}
            value={complications}
            onChange={(event) => setComplications(event.target.value)}
          />
        </div>
      </fieldset>
      {mutation.error ? (
        <p className="text-xs text-red-600">
          {errorMessage(mutation.error, "Could not save the caesarean details.")}
        </p>
      ) : null}
      {canEdit ? (
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            Save caesarean details
          </Button>
          {saved ? <span className="text-xs text-emerald-700">Saved</span> : null}
        </div>
      ) : null}
    </form>
  );
}

const APGAR_TONE_CLASS = {
  normal: "text-emerald-700",
  moderate: "text-amber-700",
  low: "text-red-700",
} as const;

function BabyRow({
  theatreCase,
  baby,
  canRecord,
  canRegister,
}: {
  theatreCase: TheatreCase;
  baby: TheatreBaby;
  canRecord: boolean;
  canRegister: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "register">("view");
  const remove = useRemoveTheatreBaby();
  const tone = apgarTone(baby.apgar_5);
  const registerable = canRegisterBaby(baby);
  const admittable = Boolean(baby.newborn_uuid) && canAdmitBaby(baby);

  return (
    <li className="space-y-2 rounded-md border p-3" data-testid="theatre-baby-row">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-brand-navy">
            Baby {baby.birth_order} · {baby.sex_label}
            {baby.outcome !== "live_birth" ? (
              <Badge variant="destructive" className="ml-2">
                {baby.outcome_label}
              </Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">
            Born {new Date(baby.time_of_birth).toLocaleString()} ·{" "}
            <span className={isLowBirthWeight(baby.birth_weight_g) ? "text-amber-700" : ""}>
              {formatBirthWeight(baby.birth_weight_g)}
              {isLowBirthWeight(baby.birth_weight_g) ? " (low birth weight)" : ""}
            </span>{" "}
            · Apgar{" "}
            <span className={tone ? APGAR_TONE_CLASS[tone] : ""}>{formatApgar(baby)}</span>
            {baby.resuscitation ? " · Resuscitated" : ""}
          </p>
          {baby.newborn_uuid ? (
            <p className="text-xs text-emerald-700">
              Registered as {baby.newborn_name}
              {baby.newborn_identifier ? ` (${baby.newborn_identifier})` : ""}
              {baby.newborn_stay_uuid ? " · admitted" : ""}
            </p>
          ) : null}
        </div>
        {mode === "view" ? (
          <div className="flex flex-wrap gap-1">
            {canRegister && (registerable || admittable) ? (
              <Button type="button" size="sm" onClick={() => setMode("register")}>
                {registerable ? "Register newborn" : "Admit baby"}
              </Button>
            ) : null}
            {canRecord ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
                Edit
              </Button>
            ) : null}
            {canRecord && !baby.newborn_uuid ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ caseUuid: theatreCase.uuid, babyUuid: baby.uuid })
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {remove.error ? (
        <p className="text-xs text-red-600">
          {errorMessage(remove.error, "Could not remove the baby.")}
        </p>
      ) : null}
      {mode === "edit" ? (
        <TheatreBabyForm
          caseUuid={theatreCase.uuid}
          baby={baby}
          onDone={() => setMode("view")}
        />
      ) : null}
      {mode === "register" ? (
        <TheatreNewbornRegisterForm
          theatreCase={theatreCase}
          baby={baby}
          onDone={() => setMode("view")}
        />
      ) : null}
    </li>
  );
}

/** Caesarean details and the babies delivered, with newborn registration. */
export function TheatreObstetricPanel({
  theatreCase,
  canRecord,
  canRegister,
}: {
  theatreCase: TheatreCase;
  canRecord: boolean;
  canRegister: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const eligible = isObstetricEligible(theatreCase);
  const query = useTheatreObstetric(theatreCase.uuid, { enabled: eligible });

  if (!eligible) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="theatre-obstetric-panel">
        Caesarean details apply to female patients only.
      </p>
    );
  }
  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading caesarean details…</p>;
  }
  if (query.error) {
    return (
      <p className="text-sm text-red-600">
        {errorMessage(query.error, "Could not load the caesarean details.")}
      </p>
    );
  }
  const record = query.data?.record ?? null;
  const babies = query.data?.babies ?? [];
  const babiesOpen = canRecordBabies(theatreCase.status);

  return (
    <div className="space-y-5" data-testid="theatre-obstetric-panel">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-navy">Caesarean section</h3>
        <ObstetricRecordForm
          key={record?.updated_at ?? "new"}
          caseUuid={theatreCase.uuid}
          record={record}
          canEdit={canRecord && isObstetricRecordEditable(theatreCase.status)}
        />
      </section>
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Babies {babies.length ? `(${babies.length})` : ""}
          </h3>
          {canRecord && babiesOpen && !adding ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
              Add baby
            </Button>
          ) : null}
        </div>
        {!babiesOpen && babies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Babies are recorded once the patient is in theatre.
          </p>
        ) : null}
        {babiesOpen && babies.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">No babies recorded yet.</p>
        ) : null}
        {adding ? (
          <TheatreBabyForm caseUuid={theatreCase.uuid} onDone={() => setAdding(false)} />
        ) : null}
        {babies.length ? (
          <ul className="space-y-2">
            {babies.map((baby) => (
              <BabyRow
                key={baby.uuid}
                theatreCase={theatreCase}
                baby={baby}
                canRecord={canRecord && babiesOpen}
                canRegister={canRegister && babiesOpen}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
