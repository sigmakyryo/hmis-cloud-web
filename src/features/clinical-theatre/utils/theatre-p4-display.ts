import type { TheatreAnaesthesiaVital } from "@/features/clinical-theatre/types/clinical-theatre.types";
import type {
  TheatreDeviceStatus,
  TheatreFamilyStage,
} from "@/features/clinical-theatre/types/theatre-p4.types";

export const DEVICE_STATUS_LABELS: Record<TheatreDeviceStatus, string> = {
  online: "Online",
  stale: "Delayed",
  offline: "Offline",
  never: "Never connected",
  revoked: "Revoked",
};

export const DEVICE_STATUS_VARIANT: Record<
  TheatreDeviceStatus,
  "success" | "warning" | "destructive" | "outline"
> = {
  online: "success",
  stale: "warning",
  offline: "destructive",
  never: "outline",
  revoked: "outline",
};

export const REVIEW_LABELS: Record<string, string> = {
  pending: "Awaiting review",
  validated: "Validated",
  rejected: "Rejected",
  not_required: "",
};

export const FAMILY_STAGE_ORDER: TheatreFamilyStage[] = [
  "checked_in",
  "pre_op",
  "in_theatre",
  "in_recovery",
  "ready",
  "returned_to_ward",
];

export const FAMILY_STAGE_STYLES: Record<TheatreFamilyStage, string> = {
  checked_in: "bg-slate-100 text-slate-900",
  pre_op: "bg-sky-100 text-sky-900",
  in_theatre: "bg-violet-100 text-violet-900",
  in_recovery: "bg-amber-100 text-amber-900",
  ready: "bg-emerald-100 text-emerald-900",
  returned_to_ward: "bg-emerald-100 text-emerald-900",
};

/** Statuses where monitors can be streaming: poll the chart only then. */
export const LIVE_CHART_STATUSES = new Set(["pre_op", "in_theatre", "sign_out", "recovery"]);

export function isLiveChart(status: string, signedAt: string | null | undefined): boolean {
  return !signedAt && LIVE_CHART_STATUSES.has(status);
}

export function isPendingDeviceVital(vital: TheatreAnaesthesiaVital): boolean {
  return vital.source === "device" && vital.review_status === "pending";
}

export type VitalChartPoint = {
  t: number;
  hr?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  etco2?: number;
};

const num = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Chart points, oldest first; rejected device rows are left out. */
export function vitalChartPoints(vitals: TheatreAnaesthesiaVital[]): VitalChartPoint[] {
  return vitals
    .filter((vital) => vital.review_status !== "rejected")
    .map((vital) => ({
      t: new Date(vital.recorded_at).getTime(),
      hr: num(vital.heart_rate),
      sbp: num(vital.systolic_bp ?? vital.ibp_systolic),
      dbp: num(vital.diastolic_bp ?? vital.ibp_diastolic),
      spo2: num(vital.spo2),
      etco2: num(vital.etco2),
    }))
    .filter((point) => Number.isFinite(point.t))
    .sort((a, b) => a.t - b.t);
}

/** "12 s ago", "4 min ago", "2 h ago" or "never". */
export function formatLastSeen(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)} h ago`;
}

/** Absolute kiosk URL for a public board token (shown once in Settings). */
export function familyBoardUrl(token: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/theatre-board/${encodeURIComponent(token)}`;
}
