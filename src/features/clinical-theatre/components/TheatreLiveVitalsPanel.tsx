"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  useReviewTheatreDeviceVitals,
  useTheatreCaseDevices,
} from "@/features/clinical-theatre/hooks/use-theatre-p4";
import type {
  TheatreAnaesthesiaRecord,
  TheatreAnaesthesiaVital,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import type { TheatreVitalReviewPayload } from "@/features/clinical-theatre/types/theatre-p4.types";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANT,
  REVIEW_LABELS,
  formatLastSeen,
  isPendingDeviceVital,
  vitalChartPoints,
} from "@/features/clinical-theatre/utils/theatre-p4-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const CHART_CONFIG: ChartConfig = {
  hr: { label: "HR", color: "#16a34a" },
  sbp: { label: "SBP", color: "#dc2626" },
  dbp: { label: "DBP", color: "#f97316" },
  spo2: { label: "SpO₂", color: "#2563eb" },
  etco2: { label: "EtCO₂", color: "#9333ea" },
};

const TIME = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

type Column = { key: keyof TheatreAnaesthesiaVital; label: string };

const COLUMNS: Column[] = [
  { key: "heart_rate", label: "HR" },
  { key: "systolic_bp", label: "SBP" },
  { key: "diastolic_bp", label: "DBP" },
  { key: "mean_bp", label: "MAP" },
  { key: "ibp_systolic", label: "IBP S" },
  { key: "ibp_diastolic", label: "IBP D" },
  { key: "spo2", label: "SpO₂" },
  { key: "etco2", label: "EtCO₂" },
  { key: "respiratory_rate", label: "RR" },
  { key: "temperature_c", label: "Temp" },
  { key: "mac", label: "MAC" },
];

type Props = {
  caseUuid: string;
  record: TheatreAnaesthesiaRecord | null | undefined;
  live: boolean;
  canValidate: boolean;
  editable: boolean;
};

/** Live vitals: device status, trend chart, and review of monitor readings. */
export function TheatreLiveVitalsPanel({ caseUuid, record, live, canValidate, editable }: Props) {
  const vitals = useMemo(() => record?.vitals ?? [], [record]);
  const devices = useTheatreCaseDevices(caseUuid, live);
  const review = useReviewTheatreDeviceVitals();
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const points = useMemo(() => vitalChartPoints(vitals), [vitals]);
  const pending = vitals.filter(isPendingDeviceVital);
  const pendingFlagged = pending.filter((vital) => vital.is_artefact).length;
  const visibleColumns = COLUMNS.filter((column) =>
    vitals.some((vital) => vital[column.key] !== null && vital[column.key] !== undefined && vital[column.key] !== ""),
  );
  const columns = visibleColumns.length ? visibleColumns : COLUMNS.slice(0, 7);
  const canReview = canValidate && editable;

  const submit = (payload: TheatreVitalReviewPayload) =>
    review.mutate(
      { caseUuid, payload },
      {
        onSuccess: () => {
          setSelected([]);
          setNote("");
        },
      },
    );

  const toggle = (uuid: string) =>
    setSelected((current) =>
      current.includes(uuid) ? current.filter((id) => id !== uuid) : [...current, uuid],
    );

  const deviceRows = devices.data?.devices ?? [];

  return (
    <div className="space-y-3" data-testid="theatre-live-vitals">
      <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="theatre-device-status">
        <span className="font-medium text-brand-navy">Monitors</span>
        {deviceRows.length === 0 ? (
          <span className="text-muted-foreground">
            No monitor linked to {devices.data?.room_name || "this room"}; enter vitals manually.
          </span>
        ) : (
          deviceRows.map((device) => (
            <Badge key={device.uuid} variant={DEVICE_STATUS_VARIANT[device.status]}>
              {device.name}: {DEVICE_STATUS_LABELS[device.status]} · last seen{" "}
              {formatLastSeen(device.last_seen_at)}
              {device.last_error ? ` · ${device.last_error}` : ""}
            </Badge>
          ))
        )}
        {live ? (
          <span className="text-muted-foreground" data-testid="theatre-live-indicator">
            · auto-refreshing
          </span>
        ) : null}
      </div>

      {points.length > 1 ? (
        <ChartContainer config={CHART_CONFIG} className="aspect-auto h-56 w-full">
          <LineChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tickFormatter={(value: number) => TIME.format(new Date(value))}
            />
            <YAxis tickLine={false} axisLine={false} width={36} domain={[0, "auto"]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(_, payload) => {
                    const t = payload?.[0]?.payload?.t;
                    return typeof t === "number" ? TIME.format(new Date(t)) : "";
                  }}
                />
              }
            />
            {(["hr", "sbp", "dbp", "spo2", "etco2"] as const).map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      ) : null}

      {pending.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
          data-testid="theatre-pending-review"
        >
          <span>
            {pending.length} monitor reading(s) awaiting review
            {pendingFlagged ? `, ${pendingFlagged} flagged as possible artefact` : ""}. The
            record cannot be signed until they are validated or rejected.
          </span>
          {canReview ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={review.isPending || pending.length === pendingFlagged}
                onClick={() => submit({ action: "validate", scope: "pending_clean" })}
              >
                Validate all unflagged
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={review.isPending || pendingFlagged === 0}
                onClick={() => submit({ action: "reject", scope: "pending_artefacts", note })}
              >
                Reject all flagged
              </Button>
            </>
          ) : (
            <span>A clinician with device-vital validation rights must review them.</span>
          )}
        </div>
      ) : null}

      {canReview && selected.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2" data-testid="theatre-selected-review">
          <span className="text-xs">{selected.length} selected</span>
          <Button
            size="sm"
            disabled={review.isPending}
            onClick={() => submit({ action: "validate", vital_ids: selected, note })}
          >
            Validate selected
          </Button>
          <Input
            aria-label="Reason for rejecting"
            placeholder="Reason (required to reject)"
            className="h-8 w-56"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={review.isPending || !note.trim()}
            onClick={() => submit({ action: "reject", vital_ids: selected, note })}
          >
            Reject selected
          </Button>
        </div>
      ) : null}
      {review.error ? (
        <p className="text-xs text-red-600">{errorMessage(review.error, "Could not review.")}</p>
      ) : null}

      {vitals.length === 0 ? (
        <p className="text-xs text-muted-foreground">No vitals recorded yet.</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm" data-testid="theatre-anaesthesia-vitals">
            <thead className="sticky top-0 bg-white text-left text-xs text-muted-foreground">
              <tr>
                {canReview ? <th className="py-1 pr-2" aria-label="Select" /> : null}
                <th className="py-1 pr-3">Time</th>
                {columns.map((column) => (
                  <th key={column.key} className="py-1 pr-3">
                    {column.label}
                  </th>
                ))}
                <th className="py-1 pr-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((row) => {
                const rejected = row.review_status === "rejected";
                return (
                  <tr
                    key={row.uuid}
                    className={`border-t ${rejected ? "text-muted-foreground line-through" : ""} ${
                      row.is_artefact && !rejected ? "bg-amber-50" : ""
                    }`}
                    data-testid={`theatre-vital-row-${row.uuid}`}
                  >
                    {canReview ? (
                      <td className="py-1 pr-2">
                        {isPendingDeviceVital(row) ? (
                          <input
                            type="checkbox"
                            aria-label={`Select reading ${TIME.format(new Date(row.recorded_at))}`}
                            checked={selected.includes(row.uuid)}
                            onChange={() => toggle(row.uuid)}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    <td className="py-1 pr-3">{TIME.format(new Date(row.recorded_at))}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="py-1 pr-3">
                        {(row[column.key] as string | number | null | undefined) ?? "—"}
                      </td>
                    ))}
                    <td className="py-1 pr-3 text-xs">
                      {row.source === "device" ? (
                        <span className="inline-flex flex-wrap items-center gap-1">
                          <Badge variant="secondary">Monitor{row.device_name ? `: ${row.device_name}` : ""}</Badge>
                          {row.review_status && REVIEW_LABELS[row.review_status] ? (
                            <Badge
                              variant={
                                row.review_status === "validated"
                                  ? "success"
                                  : row.review_status === "rejected"
                                    ? "outline"
                                    : "warning"
                              }
                              title={row.review_note || undefined}
                            >
                              {REVIEW_LABELS[row.review_status]}
                            </Badge>
                          ) : null}
                          {row.is_artefact ? (
                            <Badge variant="destructive" title={(row.artefact_reasons ?? []).join("; ")}>
                              Possible artefact
                            </Badge>
                          ) : null}
                        </span>
                      ) : (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
