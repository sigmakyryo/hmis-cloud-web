"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, History, Save } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { DetailPageSkeleton, ListPageLayout } from "@/features/app-shell/components/page-layout";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhStatusChip } from "@/features/occupational-health/components/OhStatusChip";
import { OhIodCaseDetailPage } from "@/features/occupational-health/pages/OhIodCaseDetailPage";
import {
  certificatePdfUrl,
  fetchCertificateHistory,
  fetchCertificateVerifyLink,
  cancelSickLeave,
  recordSickLeaveReturn,
  sickLeavePdfUrl,
} from "@/features/occupational-health/services/oh-ext.service";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { bffRequest } from "@/lib/bff-client";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/providers/toast-provider";

type FieldType = "text" | "number" | "date" | "textarea" | "boolean" | { options: string[] };
type FieldDef = { key: string; label: string; type: FieldType };
type KindConfig = {
  title: string;
  detailPath: (uuid: string) => string;
  /** Editable fields; empty = read only (certificates change only through amend / withdraw). */
  fields: FieldDef[];
  readOnly: Array<{ key: string; label: string }>;
};

const OUTCOMES = ["fit", "fit_with_restrictions", "temporarily_unfit", "permanently_unfit", "unfit", "deferred"];

export const OH_RECORD_KINDS: Record<string, KindConfig> = {
  certificate: {
    title: "Certificate of fitness",
    detailPath: BFF_OCCUPATIONAL_HEALTH_ROUTES.fitnessCertificate,
    fields: [],
    readOnly: [
      { key: "version", label: "Version" },
      { key: "status", label: "Status" },
      { key: "valid_from", label: "Valid from" },
      { key: "valid_to", label: "Valid to" },
      { key: "signed_at", label: "Signed at" },
      { key: "withdrawal_reason", label: "Withdrawal reason" },
    ],
  },
  assessment: {
    title: "Fitness assessment",
    detailPath: BFF_OCCUPATIONAL_HEALTH_ROUTES.fitnessAssessment,
    fields: [
      { key: "outcome", label: "Outcome", type: { options: OUTCOMES } },
      { key: "review_date", label: "Review date", type: "date" },
    ],
    readOnly: [{ key: "assessed_at", label: "Assessed at" }],
  },
  finding: {
    title: "Examination finding",
    detailPath: BFF_OCCUPATIONAL_HEALTH_ROUTES.examFinding,
    fields: [
      { key: "numeric_value", label: "Numeric value", type: "number" },
      { key: "coded_value", label: "Coded value", type: "text" },
      { key: "unit", label: "Unit", type: "text" },
      { key: "threshold_flag", label: "Threshold flag", type: { options: ["none", "watch", "alert"] } },
    ],
    readOnly: [
      { key: "code", label: "Code" },
      { key: "recorded_at", label: "Recorded at" },
    ],
  },
  "sick-leave": {
    title: "Sick leave certificate",
    detailPath: (uuid: string) => `${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohExt}/oh/sick-leave/${uuid}`,
    fields: [],
    readOnly: [
      { key: "status", label: "Status" },
      { key: "start_date", label: "Off work from" },
      { key: "days", label: "Days" },
      { key: "expected_return", label: "Expected return" },
      { key: "work_capacity", label: "Work capacity" },
      { key: "employer_note", label: "Note for employer" },
      { key: "signed_at", label: "Signed" },
      { key: "hr_notified_at", label: "HR notified" },
      { key: "returned_on", label: "Returned to work" },
      { key: "return_outcome", label: "Return outcome" },
      { key: "cancel_reason", label: "Cancel reason" },
    ],
  },
};

type RecordRow = Record<string, unknown> & { uuid: string };

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 16).replace("T", " ");
  return String(value);
}

function toFormValue(value: unknown, type: FieldType): string | boolean {
  if (type === "boolean") return Boolean(value);
  if (value === null || value === undefined) return "";
  if (type === "date") return String(value).slice(0, 10);
  return String(value);
}

export function OhRecordDetailPage({ kind, uuid, extra }: { kind: string; uuid: string; extra?: ReactNode }) {
  const { userData, isLoading: isUserLoading } = useUser();
  const config = OH_RECORD_KINDS[kind];

  if (isUserLoading && kind === "iod") {
    return <DetailPageSkeleton data-testid="oh-record-detail" />;
  }
  if (isUserLoading) {
    return (
      <ListPageLayout data-testid="oh-record-detail">
        <div className="p-8 text-sm text-brand-muted">Loading…</div>
      </ListPageLayout>
    );
  }
  if (!canAccessOccupationalHealth(userData)) {
    return <OhAccessDenied data-testid="oh-record-detail" />;
  }
  if (kind === "iod") {
    return <OhIodCaseDetailPage uuid={uuid} />;
  }
  if (!config) {
    return (
      <ListPageLayout data-testid="oh-record-detail">
        <div className="p-8 text-sm text-brand-muted">Unknown record type.</div>
      </ListPageLayout>
    );
  }
  return <OhRecordDetailBody kind={kind} uuid={uuid} config={config} extra={extra} />;
}

function OhRecordDetailBody({ kind, uuid, config, extra }: { kind: string; uuid: string; config: KindConfig; extra?: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const record = useQuery({
    queryKey: ["oh-record", kind, uuid],
    queryFn: () => bffRequest<RecordRow>(config.detailPath(uuid)),
  });
  // Only the fields the user touched; everything else shows the saved value.
  const [edits, setEdits] = useState<Record<string, string | boolean>>({});
  const form = useMemo(() => {
    const out: Record<string, string | boolean> = {};
    for (const field of config.fields) {
      out[field.key] = field.key in edits ? edits[field.key] : toFormValue(record.data?.[field.key], field.type);
    }
    return out;
  }, [edits, record.data, config.fields]);

  const changes = useMemo(() => {
    if (!record.data) return {};
    const out: Record<string, unknown> = {};
    for (const field of config.fields) {
      const original = toFormValue(record.data[field.key], field.type);
      const current = form[field.key];
      if (current === undefined || current === original) continue;
      out[field.key] =
        field.type === "number" ? (current === "" ? null : Number(current)) : current === "" && field.type === "date" ? null : current;
    }
    return out;
  }, [form, record.data, config.fields]);

  const save = useMutation({
    mutationFn: () => bffRequest<RecordRow>(config.detailPath(uuid), { method: "PATCH", body: changes }),
    onSuccess: () => {
      toast({ variant: "success", title: "Saved" });
      setEdits({});
      void queryClient.invalidateQueries({ queryKey: ["oh-record", kind, uuid] });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not save", description: error instanceof Error ? error.message : undefined }),
  });

  return (
    <ListPageLayout data-testid="oh-record-detail">
      <div className="border-b border-brand-border bg-white px-4 py-5 md:px-6">
        <h1 className="text-xl font-semibold text-brand-navy">{config.title}</h1>
        <p className="text-xs text-brand-muted">{uuid}</p>
      </div>
      <div className="space-y-6 p-4 md:p-6">
        {record.isLoading ? <p className="text-sm text-brand-muted">Loading…</p> : null}
        {record.error ? <p className="text-sm text-red-700">Could not load this record.</p> : null}
        {record.data ? (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {config.readOnly.map((f) => (
                <div key={f.key}>
                  <dt className="text-xs text-brand-muted">{f.label}</dt>
                  <dd className="text-brand-navy">
                    {f.key === "status" ? <OhStatusChip value={String(record.data[f.key] ?? "")} /> : display(record.data[f.key])}
                  </dd>
                </div>
              ))}
            </dl>
            {config.fields.length > 0 ? (
              <form
                className="grid max-w-3xl gap-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (Object.keys(changes).length > 0) save.mutate();
                }}
              >
                {config.fields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={form[field.key] ?? ""}
                    onChange={(v) => setEdits((prev) => ({ ...prev, [field.key]: v }))}
                  />
                ))}
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" className="gap-1" disabled={save.isPending || Object.keys(changes).length === 0}>
                    <Save className="size-3.5" /> Save changes
                  </Button>
                </div>
              </form>
            ) : null}
            {kind === "certificate" ? <CertificateDocuments uuid={uuid} /> : null}
            {kind === "sick-leave" ? (
              <SickLeaveActions
                uuid={uuid}
                status={String(record.data.status ?? "")}
                onChanged={() => void queryClient.invalidateQueries({ queryKey: ["oh-record", kind, uuid] })}
              />
            ) : null}
            {extra}
          </>
        ) : null}
      </div>
    </ListPageLayout>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const id = `oh-field-${field.key}`;
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {field.label}
      </label>
    );
  }
  return (
    <div className={field.type === "textarea" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Label htmlFor={id}>{field.label}</Label>
      {typeof field.type === "object" ? (
        <select
          id={id}
          className="h-9 w-full rounded-md border border-dash-border bg-white px-2 text-sm"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {field.type.options.map((o) => (
            <option key={o} value={o}>
              {o.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <Textarea id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} type={field.type} value={String(value)} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/** Printable PDF, public verification link and the full version history of a certificate. */
export function CertificateDocuments({ uuid }: { uuid: string }) {
  const history = useQuery({ queryKey: ["oh-cert-history", uuid], queryFn: () => fetchCertificateHistory(uuid) });
  const link = useQuery({ queryKey: ["oh-cert-verify", uuid], queryFn: () => fetchCertificateVerifyLink(uuid) });

  return (
    <section className="space-y-4" data-testid="oh-certificate-documents">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="outline" className="gap-1">
          <a href={certificatePdfUrl(uuid)} target="_blank" rel="noreferrer">
            <FileDown className="size-3.5" /> Print / download PDF
          </a>
        </Button>
        {link.data?.verify_url ? (
          <a className="break-all text-xs text-brand-muted underline" href={link.data.verify_url} target="_blank" rel="noreferrer">
            Public verification link
          </a>
        ) : null}
      </div>
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <History className="size-4" /> Certificate history
        </h2>
        {history.isLoading ? <p className="text-sm text-brand-muted">Loading history…</p> : null}
        <ol className="space-y-2 text-sm">
          {(history.data?.versions ?? []).map((v) => (
            <li key={v.uuid} className="rounded-md border border-dash-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong>v{v.version}</strong>
                <OhStatusChip value={v.status} />
                <span className="text-xs text-brand-muted">
                  {v.valid_from ?? "—"} → {v.valid_to ?? "until review"} · signed {display(v.signed_at)}
                </span>
                {v.uuid === uuid ? <span className="text-xs text-brand-muted">(this certificate)</span> : null}
              </div>
              {v.restrictions.length > 0 ? <p className="text-xs">Restrictions: {v.restrictions.join("; ")}</p> : null}
              {v.withdrawal_reason ? <p className="text-xs text-red-700">Withdrawn: {v.withdrawal_reason}</p> : null}
              <ul className="mt-1 space-y-0.5 text-xs text-brand-muted">
                {(history.data?.events ?? [])
                  .filter((e) => e.certificate_uuid === v.uuid)
                  .map((e, i) => (
                    <li key={`${e.action}-${i}`}>
                      {display(e.occurred_at)} · {e.action}
                      {e.actor_name ? ` by ${e.actor_name}` : ""}
                      {e.reason ? ` — ${e.reason}` : ""}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Print, record the return to work (tells HR) or cancel a sick-leave certificate. */
function SickLeaveActions({ uuid, status, onChanged }: { uuid: string; status: string; onChanged: () => void }) {
  const { toast } = useToast();
  const [returnedOn, setReturnedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = useState("fit");
  const [restrictions, setRestrictions] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const done = (title: string) => {
    toast({ variant: "success", title });
    onChanged();
  };
  const fail = (error: unknown) =>
    toast({ variant: "error", title: "Could not save", description: error instanceof Error ? error.message : undefined });
  const ret = useMutation({
    mutationFn: () =>
      recordSickLeaveReturn(uuid, {
        returned_on: returnedOn,
        outcome,
        restrictions: restrictions
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      }),
    onSuccess: () => done("Return to work recorded; HR notified"),
    onError: fail,
  });
  const cancel = useMutation({
    mutationFn: () => cancelSickLeave(uuid, cancelReason.trim()),
    onSuccess: () => done("Sick leave cancelled"),
    onError: fail,
  });

  return (
    <section className="space-y-4" data-testid="oh-sick-leave-actions">
      <Button asChild size="sm" variant="outline" className="gap-1">
        <a href={sickLeavePdfUrl(uuid)} target="_blank" rel="noreferrer">
          <FileDown className="size-3.5" /> Print / download PDF
        </a>
      </Button>
      {status === "issued" ? (
        <div className="grid max-w-3xl gap-3 rounded-md border border-dash-border p-3 sm:grid-cols-3">
          <h2 className="text-sm font-semibold text-brand-navy sm:col-span-3">Return to work</h2>
          <div className="space-y-1.5">
            <Label htmlFor="oh-rtw-date">Returned on</Label>
            <Input id="oh-rtw-date" type="date" value={returnedOn} onChange={(e) => setReturnedOn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oh-rtw-outcome">Outcome</Label>
            <select
              id="oh-rtw-outcome"
              className="h-9 w-full rounded-md border border-dash-border bg-white px-2 text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="fit">Fit</option>
              <option value="fit_with_restrictions">Fit with restrictions</option>
              <option value="not_fit">Not fit</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="oh-rtw-restrictions">Work restrictions (one per line)</Label>
            <Textarea id="oh-rtw-restrictions" value={restrictions} onChange={(e) => setRestrictions(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Button type="button" size="sm" disabled={ret.isPending} onClick={() => ret.mutate()}>
              Record return to work
            </Button>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="oh-sick-cancel">Cancel reason</Label>
            <Input id="oh-sick-cancel" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={cancel.isPending || cancelReason.trim().length < 3}
              onClick={() => cancel.mutate()}
            >
              Cancel certificate
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
