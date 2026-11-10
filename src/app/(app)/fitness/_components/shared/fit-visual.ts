import { FlaskConical, GraduationCap, HeartPulse, Stethoscope, Syringe, Wind, type LucideIcon } from "lucide-react";

import type { FitItem, FitItemStatus, FitSource } from "@/features/occupational-health/services/fitness.service";

export const FIT_SOURCES: FitSource[] = ["medical", "immunisation", "drug_alcohol", "fit_test", "training", "programme"];

export const SOURCE_ICON: Record<FitSource, LucideIcon> = {
  medical: Stethoscope,
  immunisation: Syringe,
  drug_alcohol: FlaskConical,
  fit_test: Wind,
  training: GraduationCap,
  programme: HeartPulse,
};

/** Worst first. */
const STATUS_RANK: Record<FitItemStatus, number> = { blocked: 0, overdue: 1, missing: 2, restricted: 3, expiring: 4, ok: 5 };

export type FitTone = "good" | "warn" | "bad" | "missing" | "none";

export const STATUS_TONE: Record<FitItemStatus, FitTone> = {
  ok: "good",
  expiring: "warn",
  restricted: "warn",
  overdue: "bad",
  blocked: "bad",
  missing: "missing",
};

export const TONE_DOT: Record<FitTone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  missing: "bg-slate-400",
  none: "bg-slate-200",
};

export const TONE_TEXT: Record<FitTone, string> = {
  good: "text-emerald-700",
  warn: "text-amber-800",
  bad: "text-red-700",
  missing: "text-dash-muted",
  none: "text-dash-muted",
};

export const TONE_STROKE: Record<FitTone, string> = {
  good: "stroke-emerald-500",
  warn: "stroke-amber-500",
  bad: "stroke-red-500",
  missing: "stroke-slate-400",
  none: "stroke-slate-200",
};

export function worstStatus(items: FitItem[]): FitItemStatus | null {
  return items.reduce<FitItemStatus | null>(
    (worst, item) => (worst === null || STATUS_RANK[item.status] < STATUS_RANK[worst] ? item.status : worst),
    null,
  );
}

export function groupBySource(items: FitItem[]): Map<FitSource, FitItem[]> {
  const grouped = new Map<FitSource, FitItem[]>();
  for (const item of items) {
    grouped.set(item.source, [...(grouped.get(item.source) ?? []), item]);
  }
  return grouped;
}

const DAY_MS = 86_400_000;

/** Whole days from today to the given date; negative when past. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((day.getTime() - today.getTime()) / DAY_MS);
}

export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days < 60) return `in ${days} days`;
  const months = Math.round(days / 30);
  return months < 24 ? `in ${months} months` : `in ${Math.round(days / 365)} years`;
}
