"use client";

import { useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useGenerateTheatrePreOpOrders,
  useRecordTheatreClearance,
  useResolveTheatrePreOpTest,
  useUpdateTheatrePreOpAssessment,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type {
  TheatreClearance,
  TheatreComorbidity,
  TheatrePreOpAssessment,
  TheatreRequiredTest,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  ASA_GRADES,
  CLEARANCE_LABELS,
  COMORBIDITIES,
  REQUIRED_TEST_TONE,
  formatDateTime,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const ORDER_TYPE_LABELS = { laboratory: "Lab", radiology: "Imaging", procedure: "Other" } as const;

/** Tests the user can select for ordering: still required and not yet ordered. */
export function orderableTests(tests: TheatreRequiredTest[]): TheatreRequiredTest[] {
  return tests.filter((test) => test.status === "required" && test.product);
}

/** Why "Fit" cannot be recorded yet, or null when it can. */
export function fitClearanceBlocker(
  assessment: Pick<TheatrePreOpAssessment, "asa_grade" | "outstanding_tests">,
  override: boolean,
  notes: string,
): string | null {
  if (!assessment.asa_grade) return "Record the ASA grade before clearing the patient.";
  if (assessment.outstanding_tests > 0 && !override) {
    return `${assessment.outstanding_tests} required test(s) have no result. Waive them, record results, or override with notes.`;
  }
  if (assessment.outstanding_tests > 0 && override && !notes.trim()) {
    return "Explain in the notes why the patient is fit despite outstanding tests.";
  }
  return null;
}

export function TheatrePreOpAssessmentPanel({
  assessment,
  canRecord,
  canClear,
}: {
  assessment: TheatrePreOpAssessment;
  canRecord: boolean;
  canClear: boolean;
}) {
  return (
    <div className="space-y-5" data-testid="theatre-pre-op-assessment">
      <AssessmentForm
        key={`${assessment.uuid}-${assessment.updated_at}`}
        assessment={assessment}
        canRecord={canRecord}
      />
      <RequiredTests assessment={assessment} canRecord={canRecord} />
      <ClearanceSection
        key={`clearance-${assessment.uuid}-${assessment.updated_at}`}
        assessment={assessment}
        canClear={canClear}
      />
    </div>
  );
}

function AssessmentForm({
  assessment,
  canRecord,
}: {
  assessment: TheatrePreOpAssessment;
  canRecord: boolean;
}) {
  const [asa, setAsa] = useState(assessment.asa_grade);
  const [comorbidities, setComorbidities] = useState<TheatreComorbidity[]>(
    assessment.comorbidities,
  );
  const [weight, setWeight] = useState(assessment.weight_kg ?? "");
  const [height, setHeight] = useState(assessment.height_cm ?? "");
  const [airway, setAirway] = useState(assessment.airway_notes);
  const [findings, setFindings] = useState(assessment.findings);
  const [plan, setPlan] = useState(assessment.plan);
  const update = useUpdateTheatrePreOpAssessment();
  const disabled = !canRecord;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({
          uuid: assessment.uuid,
          payload: {
            asa_grade: asa,
            comorbidities,
            weight_kg: weight || null,
            height_cm: height || null,
            airway_notes: airway,
            findings,
            plan,
          },
        });
      }}
    >
      <h3 className="text-sm font-semibold text-brand-navy">Assessment</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>ASA grade</Label>
          <Select value={asa || undefined} onValueChange={setAsa} disabled={disabled}>
            <SelectTrigger aria-label="ASA grade">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASA_GRADES.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  ASA {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pre-op-weight">Weight (kg)</Label>
          <Input
            id="pre-op-weight"
            type="number"
            min={0}
            step="0.1"
            value={weight}
            disabled={disabled}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pre-op-height">Height (cm)</Label>
          <Input
            id="pre-op-height"
            type="number"
            min={0}
            step="0.1"
            value={height}
            disabled={disabled}
            onChange={(event) => setHeight(event.target.value)}
          />
        </div>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Comorbidities</legend>
        <div className="grid gap-1 sm:grid-cols-3">
          {COMORBIDITIES.map((row) => (
            <label key={row.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={disabled}
                checked={comorbidities.includes(row.value)}
                onChange={(event) =>
                  setComorbidities(
                    event.target.checked
                      ? [...comorbidities, row.value]
                      : comorbidities.filter((value) => value !== row.value),
                  )
                }
              />
              {row.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pre-op-airway">Airway</Label>
          <Textarea id="pre-op-airway" rows={2} value={airway} disabled={disabled} onChange={(event) => setAirway(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pre-op-findings">Findings</Label>
          <Textarea id="pre-op-findings" rows={2} value={findings} disabled={disabled} onChange={(event) => setFindings(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pre-op-plan">Plan</Label>
          <Textarea id="pre-op-plan" rows={2} value={plan} disabled={disabled} onChange={(event) => setPlan(event.target.value)} />
        </div>
      </div>
      {canRecord ? (
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={update.isPending}>
            Save assessment
          </Button>
          <span className="text-xs text-muted-foreground">
            Saving re-checks which tests the rules require.
          </span>
        </div>
      ) : null}
      {update.error ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage(update.error, "Could not save the assessment.")}
        </p>
      ) : null}
    </form>
  );
}

type ResolveState = { test: TheatreRequiredTest; action: "waive" | "result" | "reopen"; note: string };

function RequiredTests({
  assessment,
  canRecord,
}: {
  assessment: TheatrePreOpAssessment;
  canRecord: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [resolving, setResolving] = useState<ResolveState | null>(null);
  const generate = useGenerateTheatrePreOpOrders();
  const resolve = useResolveTheatrePreOpTest();
  const orderable = orderableTests(assessment.required_tests);
  const chosen = orderable.filter((test) => selected.includes(test.uuid));

  return (
    <section className="space-y-2" data-testid="theatre-pre-op-tests">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand-navy">
          Required tests{" "}
          {assessment.outstanding_tests > 0 ? (
            <span className="font-normal text-amber-700">
              ({assessment.outstanding_tests} outstanding)
            </span>
          ) : null}
        </h3>
        {canRecord && orderable.length > 0 ? (
          <Button
            type="button"
            size="sm"
            disabled={chosen.length === 0}
            onClick={() => setConfirming(true)}
            data-testid="theatre-pre-op-order"
          >
            Order selected ({chosen.length})
          </Button>
        ) : null}
      </div>
      {assessment.required_tests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tests are required by the configured rules for this patient and procedure.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {assessment.required_tests.map((test) => (
            <li key={test.uuid} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                {canRecord && test.status === "required" ? (
                  <input
                    type="checkbox"
                    className="mt-1"
                    aria-label={`Select ${test.product?.name ?? "test"}`}
                    checked={selected.includes(test.uuid)}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, test.uuid]
                          : selected.filter((value) => value !== test.uuid),
                      )
                    }
                  />
                ) : null}
                <div>
                  <p className="font-medium">
                    {test.product?.name ?? "Test"}{" "}
                    {test.product ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {ORDER_TYPE_LABELS[test.product.order_type]}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{test.reasons.join("; ")}</p>
                  {test.ordered_at ? (
                    <p className="text-xs text-muted-foreground">
                      Ordered {formatDateTime(test.ordered_at)}
                      {test.ordered_by_name ? ` by ${test.ordered_by_name}` : ""}
                      {test.result_status ? ` · ${test.result_status}` : ""}
                    </p>
                  ) : null}
                  {test.result_summary || test.waived_reason ? (
                    <p className="text-xs">{test.result_summary || test.waived_reason}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <StatusDotBadge tone={REQUIRED_TEST_TONE[test.status]}>{test.status_label}</StatusDotBadge>
                {canRecord && (test.status === "required" || test.status === "ordered") ? (
                  <>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setResolving({ test, action: "result", note: "" })}>
                      Result
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setResolving({ test, action: "waive", note: "" })}>
                      Waive
                    </Button>
                  </>
                ) : null}
                {canRecord && (test.status === "waived" || test.status === "resulted") ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setResolving({ test, action: "reopen", note: "" })}>
                    Reopen
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {generate.error ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage(generate.error, "Could not order the tests.")}
        </p>
      ) : null}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order pre-op tests?</DialogTitle>
            <DialogDescription>
              These are placed as clinical orders on the patient&apos;s visit and charged to
              their bill like any other order.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 text-sm">
            {chosen.map((test) => (
              <li key={test.uuid}>
                {test.product?.name}{" "}
                <span className="text-muted-foreground">
                  ({test.product ? ORDER_TYPE_LABELS[test.product.order_type] : ""})
                </span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={generate.isPending || chosen.length === 0}
              onClick={() =>
                generate.mutate(
                  {
                    uuid: assessment.uuid,
                    tests: chosen.map((test) => test.uuid),
                    confirm: true,
                  },
                  {
                    onSuccess: () => {
                      setConfirming(false);
                      setSelected([]);
                    },
                    onError: () => setConfirming(false),
                  },
                )
              }
              data-testid="theatre-pre-op-order-confirm"
            >
              Confirm and order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(resolving)} onOpenChange={(open) => (open ? null : setResolving(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resolving?.action === "waive"
                ? "Waive test"
                : resolving?.action === "reopen"
                  ? "Reopen test"
                  : "Record result"}
            </DialogTitle>
            <DialogDescription>{resolving?.test.product?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pre-op-resolve-note">
              {resolving?.action === "waive" ? "Reason" : resolving?.action === "reopen" ? "Reason" : "Result / where it was done"}
            </Label>
            <Textarea
              id="pre-op-resolve-note"
              rows={3}
              value={resolving?.note ?? ""}
              onChange={(event) => resolving && setResolving({ ...resolving, note: event.target.value })}
            />
          </div>
          {resolve.error ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(resolve.error, "Could not update the test.")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResolving(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!resolving?.note.trim() || resolve.isPending}
              onClick={() =>
                resolving &&
                resolve.mutate(
                  {
                    uuid: assessment.uuid,
                    testUuid: resolving.test.uuid,
                    action: resolving.action,
                    note: resolving.note.trim(),
                  },
                  { onSuccess: () => setResolving(null) },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ClearanceSection({
  assessment,
  canClear,
}: {
  assessment: TheatrePreOpAssessment;
  canClear: boolean;
}) {
  const [clearance, setClearance] = useState<TheatreClearance | "">("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [override, setOverride] = useState(false);
  const record = useRecordTheatreClearance();
  const blocker =
    clearance === "fit"
      ? fitClearanceBlocker(assessment, override, notes)
      : clearance && !notes.trim()
        ? "Notes are required for unfit or deferred."
        : null;

  return (
    <section className="space-y-2" data-testid="theatre-pre-op-clearance">
      <h3 className="text-sm font-semibold text-brand-navy">Fitness clearance</h3>
      {assessment.clearance ? (
        <p className="text-sm">
          <StatusDotBadge
            tone={
              assessment.clearance === "fit"
                ? assessment.clearance_valid
                  ? "success"
                  : "warning"
                : assessment.clearance === "unfit"
                  ? "danger"
                  : "warning"
            }
          >
            {assessment.clearance_label}
            {assessment.clearance === "fit" && !assessment.clearance_valid ? " (expired)" : ""}
          </StatusDotBadge>{" "}
          <span className="text-xs text-muted-foreground">
            {assessment.cleared_by_name ? `by ${assessment.cleared_by_name}` : ""}
            {assessment.cleared_at ? ` · ${formatDateTime(assessment.cleared_at)}` : ""}
            {assessment.valid_until ? ` · valid until ${assessment.valid_until}` : ""}
          </span>
          {assessment.clearance_notes ? (
            <span className="block text-xs">{assessment.clearance_notes}</span>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Not yet cleared.</p>
      )}
      {canClear ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={clearance || undefined} onValueChange={(value) => setClearance(value as TheatreClearance)}>
                <SelectTrigger aria-label="Clearance decision">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CLEARANCE_LABELS) as TheatreClearance[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {CLEARANCE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clearance === "fit" ? (
              <div className="space-y-1.5">
                <Label htmlFor="pre-op-valid-until">Valid until (default from settings)</Label>
                <Input
                  id="pre-op-valid-until"
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pre-op-clearance-notes">Notes</Label>
            <Textarea id="pre-op-clearance-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {clearance === "fit" && assessment.outstanding_tests > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} />
              Clear despite {assessment.outstanding_tests} outstanding test(s)
            </label>
          ) : null}
          {blocker ? <p className="text-xs text-amber-700">{blocker}</p> : null}
          {record.error ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(record.error, "Could not record the clearance.")}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!clearance || Boolean(blocker) || record.isPending}
            onClick={() =>
              clearance &&
              record.mutate({
                uuid: assessment.uuid,
                payload: {
                  clearance,
                  notes: notes.trim(),
                  valid_until: clearance === "fit" && validUntil ? validUntil : null,
                  override_outstanding: override,
                },
              })
            }
            data-testid="theatre-pre-op-clear"
          >
            Record clearance
          </Button>
        </div>
      ) : null}
    </section>
  );
}
